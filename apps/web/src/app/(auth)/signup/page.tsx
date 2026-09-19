import Link from 'next/link';
import { SignupForm } from './signup-form';

export const metadata = { title: 'Create a workspace' };

export default function SignupPage() {
  return (
    <div className="w-full max-w-sm">
      <h1 className="text-xl font-semibold tracking-tight text-fg">Create a workspace</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Already have one?{' '}
        <Link href="/login" className="font-medium text-accent hover:text-accent-hover">
          Sign in
        </Link>
      </p>

      <div className="mt-7">
        <SignupForm />
      </div>

      <p className="mt-6 rounded-lg border border-border bg-surface-sunken px-3.5 py-3 text-[13px] text-fg-muted">
        A new workspace starts empty, with one warehouse and your owner account. To see the product
        with data in it, use the{' '}
        <Link href="/#demo" className="font-medium text-accent hover:text-accent-hover">
          seeded demo
        </Link>{' '}
        instead.
      </p>
    </div>
  );
}
