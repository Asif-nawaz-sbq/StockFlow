import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { In, Repository } from 'typeorm';
import { DuplicateResourceError, ResourceNotFoundError } from 'src/common/errors/domain.errors';
import { AuthService } from 'src/modules/auth/auth.service';
import { Role, RoleKey } from 'src/modules/rbac/entities/role.entity';
import { InviteUserDto, UpdateUserRolesDto, UserListItemDto } from './dto/user.dto';
import { User, UserStatus } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
  ) {}

  async list(tenantId: string): Promise<UserListItemDto[]> {
    const users = await this.users.find({
      where: { tenantId },
      order: { fullName: 'ASC' },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      roles: (user.roles ?? []).map((role) => role.key),
      lastLoginAt: user.lastLoginAt,
    }));
  }

  /**
   * Creates the member with a random unusable password. There is no email
   * delivery in this build, so an invited user stays in `invited` until an
   * owner sets their password - noted as a gap in the README rather than
   * papered over with a fake "invite sent" toast.
   */
  async invite(tenantId: string, dto: InviteUserDto): Promise<UserListItemDto> {
    const existing = await this.users.findOne({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existing) throw new DuplicateResourceError('user', 'email', dto.email);

    const roles = await this.resolveRoles(dto.roles);
    const passwordHash = await AuthService.hashPassword(randomBytes(32).toString('hex'));

    const user = await this.users.save(
      this.users.create({
        tenantId,
        email: dto.email,
        fullName: dto.fullName,
        passwordHash,
        status: UserStatus.INVITED,
        roles,
      }),
    );

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      roles: roles.map((role) => role.key),
      lastLoginAt: null,
    };
  }

  async setRoles(tenantId: string, id: string, dto: UpdateUserRolesDto): Promise<UserListItemDto> {
    const user = await this.findOne(tenantId, id);
    await this.assertNotLastOwner(tenantId, user, dto.roles);

    user.roles = await this.resolveRoles(dto.roles);
    const saved = await this.users.save(user);

    return {
      id: saved.id,
      email: saved.email,
      fullName: saved.fullName,
      status: saved.status,
      roles: saved.roles.map((role) => role.key),
      lastLoginAt: saved.lastLoginAt,
    };
  }

  /**
   * Bumping token_version invalidates every refresh token this user holds, so
   * disabling an account takes effect within one access-token lifetime instead
   * of waiting a week for their refresh cookie to expire.
   */
  async setStatus(tenantId: string, id: string, status: UserStatus): Promise<UserListItemDto> {
    const user = await this.findOne(tenantId, id);

    if (status !== UserStatus.ACTIVE) {
      await this.assertNotLastOwner(tenantId, user, []);
    }

    user.status = status;
    user.tokenVersion += 1;
    const saved = await this.users.save(user);

    return {
      id: saved.id,
      email: saved.email,
      fullName: saved.fullName,
      status: saved.status,
      roles: (saved.roles ?? []).map((role) => role.key),
      lastLoginAt: saved.lastLoginAt,
    };
  }

  private async findOne(tenantId: string, id: string): Promise<User> {
    const user = await this.users.findOne({ where: { tenantId, id } });
    if (!user) throw new ResourceNotFoundError('User', id);
    return user;
  }

  private async resolveRoles(keys: RoleKey[]): Promise<Role[]> {
    const roles = await this.roles.find({ where: { key: In(keys) } });
    if (roles.length !== new Set(keys).size) {
      throw new ResourceNotFoundError('Role', keys.join(', '));
    }
    return roles;
  }

  /** Locking yourself out of your own workspace is a support ticket, not a feature. */
  private async assertNotLastOwner(
    tenantId: string,
    user: User,
    nextRoles: RoleKey[],
  ): Promise<void> {
    const isOwner = (user.roles ?? []).some((role) => role.key === RoleKey.OWNER);
    if (!isOwner || nextRoles.includes(RoleKey.OWNER)) return;

    const owners = await this.users
      .createQueryBuilder('u')
      .innerJoin('u.roles', 'r')
      .where('u.tenant_id = :tenantId', { tenantId })
      .andWhere('r.key = :owner', { owner: RoleKey.OWNER })
      .andWhere('u.status = :status', { status: UserStatus.ACTIVE })
      .getCount();

    if (owners <= 1) {
      throw new BadRequestException({
        code: 'LAST_OWNER',
        message: 'This workspace needs at least one active owner',
      });
    }
  }
}
