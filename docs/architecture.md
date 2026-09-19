# Architecture notes

## Why the ledger

`stock_movements` is append-only and is the source of truth for on-hand stock.
`stock_levels` holds the running totals per (product, warehouse) so the hot read
path is one indexed row rather than a `SUM` over the whole journal.

That means `stock_levels` is a cache, and caches drift. `InventoryService.rebuildLevels`
recomputes every total from the ledger and reports what it corrected; there is
an integration test that corrupts a level by hand and asserts the rebuild fixes
it. Reservations are deliberately left alone by the rebuild - they belong to
open orders, not to movement history.

## The three quantities

| Column     | Meaning                                                        |
|------------|----------------------------------------------------------------|
| `on_hand`  | Physically in the building, including units already promised     |
| `reserved` | Promised to confirmed-but-unshipped sales orders                 |
| `on_order` | On open purchase orders, not yet received                        |

Available to sell is `on_hand - reserved`. Replenishment works on
`on_hand - reserved + on_order`, otherwise every run would re-suggest an order
that is already in transit.

## Order lifecycle

```
draft ──confirm──> confirmed ──pick──> picked ──ship──> shipped
  │                    │                  │
  └──────────────── cancel ───────────────┘
```

- **confirm** reserves stock. `on_hand` does not move.
- **ship** converts the reservation into an `issue` movement. This is the only
  point at which `on_hand` drops.
- **cancel** releases whatever was reserved. Shipped orders cannot be cancelled.

Transitions are declared in `SALES_ORDER_TRANSITIONS`; anything not listed is a
409 rather than a silent no-op.

## Concurrency

`InventoryService.reserve` locks each `stock_levels` row `FOR UPDATE` before
reading it, and locks rows in a deterministic order (sorted by product id).

Both parts matter:

- Without the lock, two concurrent confirms both read `on_hand = 10`, both pass
  the availability check, and the warehouse is committed to selling twelve units
  it does not have.
- Without the sort, two orders containing the same products in a different
  sequence grab locks in opposite order and deadlock. Postgres kills one of
  them, which surfaces as an intermittent 500 under load.

`test/allocation.e2e-spec.ts` fires ten concurrent confirms for six units each
against ten units of stock and asserts exactly one wins.

## Money

Every amount is an integer of cents. VAT is computed on the discounted line net,
not per unit, and rounded half-up once per line - per-unit rounding drifts by a
cent on quantities like `3 × 3.33`. Order totals sum pre-rounded line values
rather than re-deriving VAT from the subtotal, which would be wrong the moment
an order mixes the 19% and 7% bands.

## Multi-tenancy

Every tenant-owned table carries `tenant_id`, and the value always comes from
the validated JWT - never from a header, query parameter or request body.

Postgres row-level security was considered and rejected: the app connects with a
single role, so RLS would need a `SET LOCAL` per request plus a second database
role to be worth anything. The trade-off is that tenant scoping lives in the
services and has to be maintained there. It would be worth revisiting if tenants
ever got direct SQL access.

## Caching

Redis holds three things:

1. **Refresh tokens**, keyed by `jti`. This is what makes logout actually
   revoke a session rather than just deleting a cookie the attacker already
   copied. Refresh tokens are single-use: the `jti` is burned on use.
2. **Dashboard and replenishment results**, 60-120s TTL. These are five
   sequential aggregate scans; without the cache the landing page has a visible
   spinner.
3. **Rate limit counters** via `@nestjs/throttler`.

Cache invalidation happens *after* the transaction commits, not inside it -
invalidating early lets a concurrent read repopulate the cache with rows that
are not visible yet.

A Redis outage degrades the app to uncached reads and forces re-login; it does
not take the API down. `/health/ready` reports Redis as degraded rather than
failing, so a Redis blip does not fail a deployment.

## Idempotency

`Idempotency-Key` is honoured on order create, confirm, ship and goods receipt.
Keys live in Postgres rather than Redis on purpose: a replayed confirm that
slipped through an evicted Redis key would double-reserve stock, so the guard
needs the same durability as the write it is guarding.

Same key + same body replays the stored response. Same key + different body is a
422, because that means the client is reusing a key by mistake.

---

## Topology

### Local (docker compose)

```
                    ┌──────────────┐
   browser  ───────▶│  web  :3000  │  Next.js, server components
                    └──────┬───────┘
                           │  server-side fetch over the container network
                           ▼
                    ┌──────────────┐
   browser  ───────▶│  api  :3001  │  NestJS, /api/v1
   (mutations)      └───┬──────┬───┘
                        │      │
              ┌─────────▼─┐  ┌─▼──────────┐
              │ postgres  │  │   redis    │
              │   :5432   │  │   :6379    │
              └───────────┘  └────────────┘
```

The browser talks to Next for pages and directly to the API for mutations.
Server components call the API over the container network rather than back out
through the browser, so an SSR render costs one hop.

### AWS (staging, as deployed)

![Architecture diagram](architecture-diagram.svg)

Drawn from the applied staging state, not from a plan. There is no Route 53
zone and no ACM certificate because no domain was registered, so the listener
is HTTP on port 80 and the diagram says so. Full-size copies live at
[architecture-diagram.svg](architecture-diagram.svg) and
[architecture-diagram.png](architecture-diagram.png).

One ALB with path-based routing rather than two. WAF attaches per load balancer,
so a second ALB doubles both the ALB and the web-ACL cost for no security gain —
the API is already unreachable except from the ALB's security group. A single
hostname also avoids CORS and cookie-domain problems entirely.

---

Back to the [README](../README.md).
