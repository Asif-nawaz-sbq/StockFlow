# Development

## Running it locally

Requires Docker with Compose v2. Nothing else — Node is only needed if you want
to run the tests outside a container.

```bash
cp .env.example .env
docker compose up -d --build

# wait for the api to report healthy, then:
docker compose exec api npm run migration:run
docker compose exec api npm run seed
```

Or, with the Makefile:

```bash
make reset     # clean slate: rebuild, migrate, seed
make logs
make help      # everything else
```

| Service | URL |
|---|---|
| Marketing site | http://localhost:3000 |
| Sign in / sign up | http://localhost:3000/login, `/signup` |
| Application | http://localhost:3000/dashboard |
| API | http://localhost:3001/api/v1 |
| API docs (Swagger) | http://localhost:3001/docs |
| Health | http://localhost:3001/health/live, `/health/ready` |

The landing page has an **Open the live demo** button that signs you straight
into the seeded workspace — no typing credentials. Sign-up is real: it creates a
tenant, an owner account and a starter warehouse in one transaction, then signs
the new owner in. A fresh workspace is empty by design, which is what the empty
states are for.

### Demo logins

All four accounts use the password from `SEED_OWNER_PASSWORD` in `.env`
(`Sommer2026!` by default). The roles differ, which is the point — sign in as
the read-only account and watch the write buttons disappear and the API return
403.

| Email | Role | Can do |
|---|---|---|
| a.brenner@nordmann-handel.de | Owner | Everything |
| t.osterkamp@nordmann-handel.de | Operations Manager | Trading, pricing, purchasing |
| d.uenal@nordmann-handel.de | Warehouse Clerk | Stock and fulfilment, no pricing |
| h.voss@nordmann-handel.de | Viewer | Read only |

### Frontend

The UI is a small design system rather than styled-per-page markup:

- **Semantic colour tokens** as CSS variables (`--surface`, `--fg-muted`, `--danger-subtle`, …).
  Dark mode is a swap of those variables under `prefers-color-scheme`, so it is pure CSS —
  no toggle, no class on `<html>`, and nothing for React to hydrate around. It follows the
  operating system setting.
- **Component primitives** under `src/components/ui/` — `Button`, `Card`, `Badge`, table parts,
  `StatCard`, `EmptyState`, `Progress`, `Skeleton`. Pages compose these; none of them
  hand-roll a border radius.
- **Charts are hand-written SVG.** The revenue area chart and the ranked bar list are about
  forty lines of path maths between them. A charting library would have added several hundred
  kilobytes to the landing page for one series of fourteen points, and tooltips work as native
  `<title>` elements with no client JavaScript.
- **Route-level `loading.tsx`** on every list page, with skeletons shaped like the table that
  is coming, so navigation never flashes an empty frame.
- **Responsive** down to 390px: the sidebar becomes a slide-over drawer and wide tables scroll
  inside their own container.

The interface is English. Amounts stay in EUR because the business is a European wholesaler,
so `en-GB` formatting gives `€1,234.50` — English conventions, correct currency. Supplier,
customer and city names in the seed data are German proper nouns and stay that way; a
Düsseldorf wholesaler's ledger genuinely looks like that.

Timestamps are formatted in a **pinned** `Europe/Berlin` timezone. An unpinned formatter
renders in whatever zone the runtime is in — UTC in the container, local time in the browser
— which is a hydration mismatch waiting to happen, and wrong besides: a goods receipt happened
at a warehouse wall-clock time regardless of where it is read.

### A tour worth taking

1. **Dashboard** — KPI tiles, a 14-day revenue chart and a live movement feed.
2. **Products** — filter by category, open a product, read its full ledger with
   the running balance stamped on every row.
3. **Sales orders** — open a draft, hit *Confirm and reserve*, then watch the
   product's reserved figure move without on-hand changing. Ship it and watch
   on-hand drop and a goods-out movement appear.
4. **Replenishment** — reorder suggestions, rounded up to each supplier's
   minimum order quantity.
5. **Audit log** — everything you just did, with actor and IP.

---

## Migrations and seeders

Migrations are TypeORM files with real `up()` and `down()`, run from
`apps/api/src/database/migrations`. `synchronize` is hardcoded off — schema
changes only ever land through a reviewed migration.

```bash
docker compose exec api npm run migration:run       # apply
docker compose exec api npm run migration:revert    # roll back one
docker compose exec api npm run migration:show      # what is applied

# after changing an entity, generate the diff:
docker compose exec api npm run migration:generate src/database/migrations/YourChange
```

Both migrations round-trip: reverting leaves only `typeorm_migrations`, and
re-running rebuilds all 19 tables.

There are two:

- `InitialSchema` — generated from the entities. 19 tables, including the check
  constraints that make `reserved > on_hand` impossible at the database level.
- `AddTenantForeignKeys` — hand-written. Adds the `tenant_id` foreign keys the
  generator missed (see [Issues](issues-and-bugs.md), #1) plus three
  indexes for the order list, the replenishment scan, and idempotency cleanup.

### Seeding

```bash
docker compose exec api npm run seed
```

Truncates the tenant-scoped tables and rebuilds them. Roles and permissions are
upserted rather than truncated because they are reference data, not demo data.
The seeder refuses to run with `NODE_ENV=production` unless
`SEED_ALLOW_PRODUCTION=yes` is set.

It generates a workspace, four staff, two warehouses, six suppliers, 18 products,
eight customers, and then **90 days of trading history** — roughly 110 sales
orders and 8 purchase orders across ~320 stock movements, weighted so older
orders are shipped and recent ones are still in flight.

Two details worth knowing:

- It runs through `InventoryService.postMovement`, the same code the API uses,
  so the ledger and the running totals cannot end up in a state the app could
  never reach. Orders themselves go through the repositories because the service
  stamps `placedAt` with the current time and there is no sane way to backdate
  through it.
- The random number generator is seeded (`mulberry32`, fixed seed), so a reseed
  produces identical data. A demo where the numbers move every reset is useless
  for comparing screenshots or chasing a reporting bug.

Data is believable rather than `test test test`: real German trade names, EANs,
wholesale prices, and the correct VAT band per category — food staples at 7%,
spirits and packaging at 19%.

---

## Tests

```bash
make test        # 12 unit tests, no infrastructure needed
make test-e2e    # 10 integration tests, needs postgres and redis
```

Unit tests cover the money and VAT arithmetic — rounding direction, mixed bands,
discount-before-tax, and the per-unit rounding trap.

Integration tests run against a throwaway `stockflow_test` database and cover
the parts that would actually cost money if they broke: reservation, oversell
rejection, the ten-way concurrency race, cancellation releasing stock, ship
posting exactly one issue movement, illegal state transitions, the ledger's
running balance, and rebuild-from-ledger drift correction.

---

## Project layout

```
apps/
  api/
    src/
      common/        guards, filters, interceptors, money, shared DTOs
      config/        env schema, validated at boot
      database/      data-source, migrations, seeders
      modules/       one folder per domain: entities, dto, service, controller, module
      redis/         client, cache keys, TTLs
    test/            integration tests and fixtures
  web/
    public/
      screenshots/   product shots used on the marketing page
    src/
      app/
        (marketing)/ public landing page
        (auth)/      sign in and sign up
        (app)/       the authenticated product, under /dashboard
      components/
        ui/          design-system primitives
        marketing/   landing-page sections
      lib/           api clients, types, en-GB formatters
docs/
  architecture.md          ledger, concurrency and money notes
  architecture-diagram.svg the deployed staging topology
  screenshots/             console and application captures from staging
```

Every module keeps its entities, DTOs, service, controller and Nest module
together. Nothing outside `InventoryService` writes to `stock_movements` or
`stock_levels`, which is what makes the ledger trustworthy.

---

## Configuration

Copy `.env.example` to `.env`. No real secrets are committed; in AWS these come
from Secrets Manager and the `.env` file is not used at all.

Config is validated at boot with `class-validator`. A task with a missing or
malformed secret dies during startup and fails its health check rather than
serving 500s for an hour.

---

Back to the [README](../README.md).
