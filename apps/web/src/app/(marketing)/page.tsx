import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Container,
  Database,
  GitBranch,
  Server,
  ShieldCheck,
} from 'lucide-react';
import { DemoButton } from '@/components/marketing/demo-button';
import { FeatureGrid } from '@/components/marketing/feature-grid';

export const metadata = {
  title: 'StockFlow — inventory and order management',
  description:
    'Multi-tenant inventory and order management for B2B wholesalers. NestJS, PostgreSQL and Next.js, deployed to AWS ECS Fargate with Terraform.',
};

const STACK = [
  { icon: Server, label: 'NestJS + TypeORM', hint: 'REST API, 19 tables' },
  { icon: Database, label: 'PostgreSQL 16', hint: 'Row locks, check constraints' },
  { icon: Container, label: 'Docker + ECS Fargate', hint: 'Multi-stage, 413 MB image' },
  { icon: GitBranch, label: 'Terraform + GitHub OIDC', hint: 'No static AWS keys' },
];

const FLOW = [
  {
    step: '01',
    title: 'Goods arrive',
    body: 'A purchase order is raised against a supplier, sent, then received — in full or in part. Each receipt posts a journal entry and lifts on-hand stock.',
  },
  {
    step: '02',
    title: 'An order is confirmed',
    body: 'Stock is reserved inside one transaction, with a credit check against what the customer already owes. Nothing physical moves yet.',
  },
  {
    step: '03',
    title: 'The order ships',
    body: 'The reservation becomes a goods-out movement. This is the only point at which on-hand stock actually drops.',
  },
  {
    step: '04',
    title: 'Replenishment catches up',
    body: 'Anything whose available stock plus inbound orders has fallen below its reorder point shows up with a suggested quantity and a preferred supplier.',
  },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 h-80 bg-[radial-gradient(60%_100%_at_50%_100%,rgb(var(--accent)/0.16),transparent)]"
        />

        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-16 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-2xs font-medium text-fg-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
              Portfolio project · full stack and infrastructure
            </span>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
              Inventory that cannot oversell itself
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
              StockFlow is a multi-tenant back office for B2B wholesalers. Stock lives in an
              append-only ledger, orders reserve before they ship, and concurrent orders for the
              last units in the warehouse resolve to exactly one winner.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <DemoButton />
              <Link
                href="/signup"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 text-sm font-medium text-fg shadow-[var(--shadow-sm)] transition-colors hover:bg-surface-hover"
              >
                Create a workspace
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>

            <p className="mt-3 text-xs text-fg-subtle">
              The demo signs you in to a seeded workspace with 90 days of trading history. No
              sign-up required.
            </p>
          </div>

          {/* Product shot */}
          <div className="relative mx-auto mt-14 max-w-5xl">
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-lg)]">
              <div className="flex items-center gap-1.5 border-b border-border bg-surface-sunken px-3 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-border-strong" aria-hidden />
                <span className="h-2.5 w-2.5 rounded-full bg-border-strong" aria-hidden />
                <span className="h-2.5 w-2.5 rounded-full bg-border-strong" aria-hidden />
                <span className="ml-3 font-mono text-2xs text-fg-subtle">
                  stockflow · dashboard
                </span>
              </div>
              <Image
                src="/screenshots/dashboard.png"
                alt="StockFlow dashboard showing stock value, orders below reorder point, a 14-day revenue chart and recent stock movements"
                width={1440}
                height={950}
                priority
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stack strip */}
      <section className="border-b border-border bg-surface-sunken">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {STACK.map((item) => (
            <div key={item.label} className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-surface text-fg-muted">
                <item.icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-fg">{item.label}</p>
                <p className="text-xs text-fg-subtle">{item.hint}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            Built around the parts that are actually hard
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">
            Anything can list products in a table. The interesting problems in a wholesale back
            office are concurrency, correctness of money, and being able to prove after the fact
            what happened to a unit of stock.
          </p>
        </div>

        <div className="mt-10">
          <FeatureGrid />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y border-border bg-surface-sunken">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <h2 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            One unit of stock, end to end
          </h2>

          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-4">
            {FLOW.map((item) => (
              <div key={item.step} className="bg-surface p-6">
                <span className="font-mono text-2xs font-semibold text-accent">{item.step}</span>
                <h3 className="mt-2 text-sm font-semibold text-fg">{item.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <figure className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-sm)]">
              <Image
                src="/screenshots/order-detail.png"
                alt="Sales order detail with a status timeline, line items and reservation summary"
                width={1440}
                height={950}
                className="w-full"
              />
              <figcaption className="border-t border-border px-4 py-3 text-[13px] text-fg-muted">
                Order detail: status timeline, per-line reservation, VAT computed per line and
                summed — never re-derived from the subtotal.
              </figcaption>
            </figure>

            <figure className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-sm)]">
              <Image
                src="/screenshots/replenishment.png"
                alt="Replenishment view listing products below their reorder point with suggested quantities"
                width={1440}
                height={950}
                className="w-full"
              />
              <figcaption className="border-t border-border px-4 py-3 text-[13px] text-fg-muted">
                Replenishment: coverage against the reorder point, quantities rounded up to each
                supplier’s minimum order.
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
              Runs on AWS, described in Terraform
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">
              Both services run on ECS Fargate in private subnets behind a single application load
              balancer with path-based routing. One load balancer, not two: WAF attaches per
              balancer, so a second one doubles the cost for no security gain.
            </p>

            <ul className="mt-6 space-y-3">
              {[
                'Custom VPC, public and private subnets across two availability zones',
                'RDS PostgreSQL Multi-AZ and ElastiCache Redis, private subnets only',
                'Secrets Manager for database credentials and signing keys',
                'WAF with managed rule groups, CloudWatch Container Insights and alarms',
                'GitHub Actions with OIDC — plan on pull request, manual approval for production',
              ].map((item) => (
                <li key={item} className="flex gap-2.5 text-[13px] text-fg-muted">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>

            <p className="mt-6 flex items-start gap-2 rounded-xl border border-warning-border bg-warning-subtle px-4 py-3 text-[13px] text-warning">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              The AWS environment is torn down after verification. A NAT gateway, a Multi-AZ
              database and a load balancer cost real money every hour they exist.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border bg-surface-sunken p-5">
            <pre className="font-mono text-[11px] leading-relaxed text-fg-muted">
              {`                     Route 53  ─┐
                                │
                            ┌───▼───┐
                            │  WAF  │  managed rules
                            └───┬───┘
              ┌─────────────────▼─────────────────┐
   internet ─▶│      ALB (public subnets)         │
              └────┬─────────────────────────┬────┘
              /*   │                         │  /api/*
                   ▼                         ▼
            ┌────────────┐            ┌────────────┐
            │  TG: web   │            │  TG: api   │
            └─────┬──────┘            └─────┬──────┘
  ┌───────────────▼───────────────────────  ▼──────────────┐
  │  private subnets · 2 AZs                               │
  │   ┌──────────────┐          ┌──────────────┐           │
  │   │ ECS Fargate  │          │ ECS Fargate  │           │
  │   │   web svc    │          │   api svc    │           │
  │   └──────────────┘          └──────┬───────┘           │
  │                    ┌───────────────┴────────┐          │
  │            ┌───────▼────────┐      ┌────────▼───────┐  │
  │            │ RDS PostgreSQL │      │  ElastiCache   │  │
  │            │    Multi-AZ    │      │     Redis      │  │
  │            └────────────────┘      └────────────────┘  │
  └────────────────────────┬───────────────────────────────┘
                           │ NAT gateway
                           ▼ outbound only`}
            </pre>
          </div>
        </div>
      </section>

      {/* Demo CTA */}
      <section id="demo" className="border-t border-border bg-surface-sunken">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center sm:py-20">
          <h2 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            Try the demo
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-fg-muted">
            A seeded workspace for a specialty food wholesaler with two warehouses, 18 products and
            90 days of trading history. Confirm an order and watch stock move from available to
            reserved without on-hand changing.
          </p>

          <div className="mt-8 flex justify-center">
            <DemoButton label="Sign in as the demo owner" />
          </div>

          <div className="mx-auto mt-10 max-w-2xl text-left">
            <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-fg-subtle">
              Or sign in as a different role
            </p>
            <p className="mt-2 text-[13px] text-fg-muted">
              Roles are enforced on the API, not just hidden in the interface. Sign in as the
              read-only account and the write endpoints return 403.
            </p>

            <dl className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                { role: 'Owner', email: 'a.brenner@nordmann-handel.de', note: 'Full access' },
                {
                  role: 'Operations',
                  email: 't.osterkamp@nordmann-handel.de',
                  note: 'Trading, pricing, purchasing',
                },
                {
                  role: 'Warehouse',
                  email: 'd.uenal@nordmann-handel.de',
                  note: 'Stock and fulfilment',
                },
                { role: 'Read only', email: 'h.voss@nordmann-handel.de', note: 'View only' },
              ].map((account) => (
                <div
                  key={account.email}
                  className="rounded-lg border border-border bg-surface px-3.5 py-2.5"
                >
                  <dt className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px] font-medium text-fg">{account.role}</span>
                    <span className="text-2xs text-fg-subtle">{account.note}</span>
                  </dt>
                  <dd className="mt-0.5 truncate font-mono text-2xs text-fg-muted">
                    {account.email}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-3 text-2xs text-fg-subtle">
              Password for every demo account: <span className="font-mono">Sommer2026!</span>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
