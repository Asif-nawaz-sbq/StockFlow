# Issues hit while building

Kept because they are the interesting part.

**1. Circular imports killed every entity.** `BaseEntity` had a `@ManyToOne` back
to `Tenant`, which imports `User` → `Role` → `Permission` → `BaseEntity`. By the
time `Permission` was evaluated, `BaseEntity` was `undefined` and the class
extension threw. Fix: the base class holds the `tenant_id` column but no
relation, and the foreign keys are added in a hand-written migration. Entities
that genuinely need to traverse to the tenant (only `User` does) declare the
relation themselves.

**2. Nullable string columns broke migration generation.** `vatId: string | null`
makes TypeScript emit `Object` as the design-time type, and TypeORM cannot map
that to a Postgres type. Every `@Column` with a `length` now carries an explicit
`type: 'varchar'`.

**3. Health checks 404'd behind URI versioning.** `setGlobalPrefix('api', { exclude: [...] })`
removes the prefix but not the version, so the routes landed at `/v1/health/live`.
Marking the controller `VERSION_NEUTRAL` fixed it. Worth catching now — the ALB
target group health check should not have to know which API version is current.

**4. Cache invalidation ran inside the transaction.** `reserve` and `release`
were clearing Redis before their transaction committed, which leaves a window
where a concurrent read repopulates the cache with rows that are not visible
yet. Invalidation moved to the caller, after commit.

**5. Credit limits froze every customer.** Exposure counted the value of *every*
shipped order forever, so after 90 days of seeded history every customer was
permanently over their limit and no order could be confirmed. Exposure now counts
confirmed and picked orders in full, plus shipped orders only while they are
inside the customer's payment-terms window. A real deployment would replace the
time window with open items from accounts receivable; that is noted in the code.

**6. `orderBy` takes property names, not column names.** `.orderBy('po.created_at')`
threw `Cannot read properties of undefined (reading 'databaseName')`, but only on
the queries that also had joins and pagination — those take TypeORM's distinct-id
subquery path, which resolves order-by columns against entity metadata. The
non-joined queries silently tolerated it, so this only surfaced on one page.

**7. `UPDATE ... SET a = b` needs the query builder.** Setting `allocated_qty = qty`
across an order's lines is not expressible through `repository.update()`; it needs
`.set({ allocatedQty: () => '"qty"' })`.

**8. Redis module and service imported each other.** The injection token lived in
`redis.module.ts`, which imports the service, which imports the token. Nest
reported it as a circular dependency inside the module. The token now lives in
its own file.

**9. Hydration mismatch from unpinned date formatting.** `Intl.DateTimeFormat`
without a `timeZone` renders in whatever zone the runtime is in — UTC in the API
container, local time in the browser — so the server and client produced
different strings for the same timestamp. Formatters now pin `Europe/Berlin`,
which is also just correct for a German wholesaler. `<html>` and `<body>` carry
`suppressHydrationWarning` separately, for attributes that password managers and
reader extensions inject before React boots.

**10. Compact currency notation is unusable in de-DE.** `notation: 'compact'`
with `style: 'currency'` renders 9153.06 as `9153,1 €` — neither compact nor
readable. Dashboard tiles and chart axes now round to whole euros instead.

**11. Tailwind cannot see interpolated class names.** A `text-${align}` template
in the table primitives produced no alignment at all, because the scanner reads
source text and never sees the composed string. Replaced with an explicit map.

**12. A redeploy can hand a browser a broken page.** Rebuilding the frontend
changes Next's build ID, so a tab still holding the previous HTML requests chunk
URLs that no longer exist, React throws, and the error boundary renders. The
boundary's `reset()` cannot fix that — only a fresh document can. It now detects
chunk-load failures and reloads once, guarded by a `sessionStorage` flag so a
genuinely broken build cannot put the tab in a refresh loop. Every error state
also offers an explicit *Reload the page* alongside *Try again*.

## Known gaps

Deliberate, not oversights:

- **No email.** Sign-up works and signs the new owner straight in, but there is
  no verification mail, no password reset and no working invite flow — inviting a
  teammate creates the account with an unusable random password and leaves it
  `invited` for an owner to set. No fake "invite sent" toast pretending otherwise.
- **No payments or invoicing.** Credit exposure approximates unpaid invoices with
  a time window, as above.
- **Single-warehouse fulfilment.** A sales order ships from one warehouse. Split
  shipments would move `warehouse_id` down to the line.
- **Permission changes take up to 15 minutes** to take effect, because claims are
  read from the access token rather than reloaded from Postgres per request.
  Anything needing immediate revocation bumps `users.token_version`, which kills
  the refresh token straight away.
- **No RLS.** Tenant scoping is enforced in the services. Reasoning in
  [architecture.md](architecture.md).

---

Back to the [README](../README.md).
