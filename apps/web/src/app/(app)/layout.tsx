import { serverFetch } from '@/lib/api';
import type { AuthUser } from '@/lib/types';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await serverFetch<AuthUser>('/auth/me');

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar permissions={user.permissions} tenantName={user.tenantName} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          fullName={user.fullName}
          email={user.email}
          roles={user.roles}
          permissions={user.permissions}
          tenantName={user.tenantName}
        />

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
