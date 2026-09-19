import Link from 'next/link';
import { Suspense } from 'react';
import { LoginForm } from './login-form';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <h1 className="text-xl font-semibold tracking-tight text-fg">Sign in</h1>
      <p className="mt-1 text-sm text-fg-muted">
        No account?{' '}
        <Link href="/signup" className="font-medium text-accent hover:text-accent-hover">
          Create a workspace
        </Link>
      </p>

      <div className="mt-7">
        <Suspense
          fallback={
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
