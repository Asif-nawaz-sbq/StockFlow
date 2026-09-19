import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { CurrentUser, Public } from 'src/common/decorators';
import { AuthService } from './auth.service';
import { ACCESS_COOKIE, REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from './auth.cookies';
import { AuthUserDto, LoginResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RegistrationService } from './registration.service';
import { TokenService } from './token.service';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly registration: RegistrationService,
    private readonly tokens: TokenService,
  ) {}

  @Public()
  // Unauthenticated write endpoint, so the tightest limit in the app.
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a workspace and its owner account' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, type: LoginResponseDto })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    await this.registration.register(dto);

    // Sign the new owner straight in - bouncing them to a login form to retype
    // credentials they entered thirty seconds ago is pointless friction.
    const session = await this.authService.login(dto.email, dto.password);

    setAuthCookies(
      res,
      session.accessToken,
      session.refreshToken,
      this.tokens.accessTtlSeconds(),
      this.tokens.refreshTtlSeconds(),
    );

    return { user: session.user, expiresIn: session.expiresIn };
  }

  @Public()
  // Tighter than the global limit: login is the endpoint worth brute-forcing.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange credentials for auth cookies' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const session = await this.authService.login(dto.email, dto.password);

    setAuthCookies(
      res,
      session.accessToken,
      session.refreshToken,
      this.tokens.accessTtlSeconds(),
      this.tokens.refreshTtlSeconds(),
    );

    return { user: session.user, expiresIn: session.expiresIn };
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate the refresh token and reissue an access cookie',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const token = req.cookies?.[REFRESH_COOKIE] as string;
    const session = await this.authService.refresh(token);

    setAuthCookies(
      res,
      session.accessToken,
      session.refreshToken,
      this.tokens.accessTtlSeconds(),
      this.tokens.refreshTtlSeconds(),
    );

    return { user: session.user, expiresIn: session.expiresIn };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the refresh token and clear cookies' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.authService.logout(req.cookies?.[REFRESH_COOKIE] as string | undefined);
    clearAuthCookies(res);
  }

  @Get('me')
  @ApiCookieAuth(ACCESS_COOKIE)
  @ApiOperation({ summary: 'Current user, roles and effective permissions' })
  @ApiResponse({ status: 200, type: AuthUserDto })
  async me(@CurrentUser('userId') userId: string): Promise<AuthUserDto> {
    return this.authService.profile(userId);
  }
}
