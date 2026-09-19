import Link from 'next/link';
import { ArrowLeft, Boxes } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-accent-fg">
              <Boxes className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-fg">StockFlow</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted transition-colors hover:text-fg"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to site
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">{children}</main>
    </div>
  );
}
