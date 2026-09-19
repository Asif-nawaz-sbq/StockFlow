import Link from 'next/link';
import { Boxes } from 'lucide-react';
import { MarketingNav } from '@/components/marketing/marketing-nav';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <MarketingNav />
      <div className="flex-1">{children}</div>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-accent text-accent-fg">
                <Boxes className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="text-sm font-semibold tracking-tight text-fg">StockFlow</span>
            </div>
            <p className="mt-2 max-w-sm text-[13px] text-fg-muted">
              A portfolio build: multi-tenant inventory and order management, deployed on AWS ECS
              Fargate with Terraform.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
            <Link href="/login" className="text-fg-muted hover:text-fg">
              Sign in
            </Link>
            <Link href="/signup" className="text-fg-muted hover:text-fg">
              Create workspace
            </Link>
            <a
              href="http://localhost:3001/docs"
              target="_blank"
              rel="noreferrer"
              className="text-fg-muted hover:text-fg"
            >
              API docs
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
