# Polish Me Up! — System Architecture Plan

## 1. Tech Stack Overview

**Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui (Radix preset, Nova theme)
**Backend:** Next.js Route Handlers / Server Actions
**Database & Auth:** Supabase (PostgreSQL + Auth + Storage)
**Auth Keys:** New Supabase API key format — `sb_publishable_...` (browser) and `sb_secret_...` (server-only)
**State Management:** Zustand + TanStack Query
**Forms:** React Hook Form + Zod validation
**Charts:** Recharts
**Icons:** Lucide React (no emojis)
**Image Storage:** Supabase Storage bucket `service-images`
**CSV Handling:** PapaParse (deferred — not in MVP)
**Folder Layout:** No `src/` directory. `app/`, `components/`, `lib/` at project root. Path alias `@/*` → `./*`.

## 2. User Roles & Access

Two roles only:
- **Customer** — browse packages, book appointments, view own bookings, earn loyalty points
- **Manicurist (Admin)** — full system control: bookings, customers/items/sales CRUD, manual entry, analytics, own availability

## 3. Authentication Architecture

**proxy.ts (root)** — refreshes Supabase auth cookies via `updateSession`. Does NOT perform authorization. Per Next.js 16 guidance and 2025 security advisory, middleware/proxy is unsafe for auth gating.

**Authorization** lives in layouts and pages:
- `app/(manicurist)/layout.tsx` — Server Component, checks `profile.role === 'manicurist'`, redirects others
- `app/(customer)/layout.tsx` — Server Component, redirects unauthenticated users to /login
- Sensitive route handlers re-verify session before mutations

**Supabase Clients**
- `lib/supabase/client.ts` — browser client (Client Components only)
- `lib/supabase/server.ts` — async server client (Server Components / Route Handlers)
- `lib/supabase/middleware.ts` — `updateSession(request)` helper

## 4. Database Schema (9 tables)

**profiles** (extends auth.users) — id, full_name, email, phone, role enum (customer | manicurist), is_student, created_at

**customers** — id, profile_id (NULLABLE for manual entries), full_name (required), email, phone, is_student, first_visit, last_visit, total_visits, total_spent, points_balance, source enum (system | manual), notes, created_at

**manicurists** — id, profile_id, bio, specialties text[], rating, total_jobs, photo_url, is_active, created_at

**manicurist_availability** — id, manicurist_id, date, start_time, end_time, is_booked, UNIQUE(manicurist_id, date, start_time)

**items** — id, name, category enum (package | addon), description, price, cost, margin (GENERATED: price - cost), stock, photo_url, duration_min, is_active, created_at

**bookings** — id, booking_number UNIQUE, customer_id, manicurist_id (NULLABLE for historical), booking_date, booking_time (NULLABLE), location_type enum (home | booth | other), address, notes, subtotal, discount_amount, discount_type enum, total, status enum, payment_status enum, source enum (system | manual), created_at, updated_at

**booking_items** — id, booking_id, item_id, quantity, unit_price (snapshot at booking time), subtotal

**sales** — id, date, booking_id (NULLABLE), gross_sales, refunds, discounts, net_sales (GENERATED), cost_of_goods, gross_profit (GENERATED), source, created_at

**promotions** — id, code, type, discount_pct, free_item_id, min_bookings, is_active, valid_until (deferred — not in MVP)

**RLS** — enabled on all tables. Helper function `is_manicurist()` checks the caller's role. Customers can read/write only their own rows; manicurists have full CRUD. The list below reflects the *final* set of policies in the database, including the five mirror policies added during Phase 7B (see `supabase/migrations/20260512120000_rls_customer_flow_fixes.sql`).

- **profiles**
  - `users see own profile` — SELECT where `id = auth.uid()`
  - `users update own profile` — UPDATE where `id = auth.uid()`
  - `manicurists see all profiles` — SELECT via `is_manicurist()`
  - `anyone can read manicurist profiles` — SELECT where `role = 'manicurist'` *(Phase 7B — needed so the order form can show manicurist names)*
- **customers**
  - `customers see own record` — SELECT where `profile_id = auth.uid()`
  - `customers create own record` — INSERT with `profile_id = auth.uid()` *(Phase 7B — order page auto-creates customer row on first visit)*
  - `customers update own record` — UPDATE / WITH CHECK both keyed on `profile_id = auth.uid()` *(Phase 7B — bump of `total_visits` / `total_spent` after a booking)*
  - `manicurists manage all customers` — ALL via `is_manicurist()`
- **manicurists**
  - `anyone can see active manicurists` — SELECT where `is_active = true`
  - `manicurists manage own row` — ALL via `is_manicurist()` and `profile_id = auth.uid()`
- **manicurist_availability**
  - `anyone can read availability` — SELECT
  - `manicurists manage own availability` — ALL via `is_manicurist()`
- **items**
  - `anyone can read active items` — SELECT where `is_active = true`
  - `manicurists manage items` — ALL via `is_manicurist()`
- **bookings**
  - `customers see own bookings` — SELECT joined through `customers.profile_id = auth.uid()`
  - `customers create own bookings` — INSERT for own customer row
  - `customers cancel own pending bookings` — UPDATE with **both** USING (`status = 'pending'` and own row) **and** WITH CHECK (`status in ('pending','cancelled')` and own row) *(Phase 7B — replacement of the original USING-only policy that silently blocked all cancels)*
  - `manicurists manage all bookings` — ALL via `is_manicurist()`
- **booking_items**
  - `customers see own booking items` — SELECT via join through bookings → customers
  - `customers insert own booking items` — INSERT with the same join in WITH CHECK *(Phase 7B — line items could not be persisted by the customer flow)*
  - `manicurists manage all booking items` — ALL via `is_manicurist()`
- **sales**
  - `manicurists manage sales` — ALL via `is_manicurist()` (no customer access)
- **promotions** *(deferred, RLS in place but unused in MVP)*
  - `manicurists manage promotions` — ALL via `is_manicurist()`

## 5. Validation: System vs Manual

| Field | System booking | Manual booking |
|-------|---------------|----------------|
| `booking_date` | ≥ today | any past date |
| `manicurist_id` | required | optional |
| `booking_time` | required | optional |
| Availability check | enforced | skipped |
| Default `status` | `pending` | `completed` |
| Default `payment_status` | `unpaid` | `paid` |

Two parallel Zod schemas per entity — strict for live, relaxed for manual. Same pattern for customers.

## 6. Customer Booking Flow

1. Homepage → browse packages
2. Add packages + add-ons to cart (Zustand, persisted to localStorage)
3. Order form → pick date/time → query available manicurists → select location (home/booth/other) → apply discounts → live price preview
4. Confirm → INSERT bookings + booking_items, mark availability booked, update customer totals
5. My Bookings → view history, cancel pending

## 7. Manicurist Flow

1. Login → dashboard with KPIs
2. Set own availability (deferred for MVP)
3. View incoming and assigned jobs
4. Mark in_progress → completed → updates sales aggregation
5. Manual customer entry (Option A only — Options B/C/D deferred)
6. CRUD on customers, items, bookings, sales
7. Sales analytics with source filter (deferred — basic KPIs only for MVP)
8. Manual CSV export of all tables for backup

## 8. Pink Color Paletteprimary-pink:   #E91E63   (CTAs, highlights)
soft-rose:      #F8BBD0   (secondary accents)
blush-beige:    #FDF2F4   (backgrounds)
white:          #FFFFFF   (cards, base)
charcoal:       #2D2D2D   (text)

## 9. MVP Scope

**Include:** auth, full schema, manual customer entry (Option A), customer booking flow, items management, basic dashboard with 4 KPI cards, CSV export.

**Deferred to v1.1 (explicit list of what is NOT in the MVP):**

- Real availability calendar — currently the order form lets the customer pick any 15-min slot in business hours; there is no per-manicurist availability check and no double-booking prevention.
- Email confirmations — `supabase.auth` email delivery is intentionally disabled for now; bookings produce no transactional email.
- Manual booking entry (Option B) — manicurists cannot backfill historical bookings through the UI yet (only customers can be added via Option A).
- CSV import wizard (Option C) — PapaParse is in the dependency list but no import UI is wired up.
- Merge-on-signup (Option D) — a manual customer row created by a manicurist is not automatically merged when the same person later signs up; rows stay disconnected.
- Promotions / discount-codes engine — `promotions` table exists with RLS, but no UI, no validation, and the only discount applied is the hard-coded 10 % student rate in `calculateDiscount`.
- Supabase Storage photo uploads — `items.photo_url` and `manicurists.photo_url` are plain text columns; the `service-images` bucket is not wired to any uploader.
- Recharts analytics charts — the manicurist dashboard ships with 4 KPI cards only; no trend / source-split / revenue chart yet.
- Server-side price recalculation on booking submit — `calculateDiscount` runs in the browser and the resulting `subtotal` / `discount_amount` / `total` are trusted on insert. Auditability comes from the per-line `unit_price` snapshot in `booking_items`. Move into a Route Handler / Server Action when payments are added.
- Atomic customer aggregates — after a booking the order page does a read-modify-write on `customers.total_visits` and `total_spent`. Two concurrent bookings for the same customer will lose an increment. A Postgres trigger or a single `update ... set total_visits = total_visits + 1` statement is needed.
- In-app booking status transitions — manicurists currently can only move a booking through pending → in_progress → completed via direct SQL; the dashboard has no status-transition controls.

## 10. Build Order

1. ✅ Supabase project + schema + RLS + seed data
2. ✅ Next.js 16 scaffold + Tailwind + shadcn/ui + dependencies
3. ✅ `lib/supabase/{client,server,middleware}.ts` + root proxy.ts
4. ✅ Auth (login + register pages, role-based layout guards)
5. ✅ Reusable `<DataTable<T>>` + Customers CRUD + Option A
6. ✅ Items management
7. ✅ Customer booking flow — 7A: homepage + packages; 7B: order form + confirmation + my-bookings. Browser testing on 7B surfaced five RLS gaps in the original migration (customers INSERT/UPDATE, profiles SELECT for manicurists, booking_items INSERT, and a `customers cancel own pending bookings` UPDATE policy that was missing WITH CHECK). They were patched in production via the Supabase SQL Editor and then captured as `supabase/migrations/20260512120000_rls_customer_flow_fixes.sql` for source control.
8. ✅ Dashboard KPIs + CSV export

## 11. Key Patterns

- **Centralized price logic:** `lib/utils/calculateDiscount.ts` runs identically on client (preview) and server (insert). Never trust client-sent totals.
- **Two Zod schemas per entity:** strict for live, relaxed for manual. `lib/validations/`.
- **Source tagging:** every analytics query supports a source filter (All / System / Manual).
- **Auth check pattern:** layout-level Server Component guard via `supabase.auth.getUser()` then profile role check, then `redirect()` from `next/navigation` if not authorized.
- **Generated columns** (`margin`, `net_sales`, `gross_profit`) — never sent in insert/update payloads. Computed on read or by Postgres.
- **Cart state:** Zustand with `persist` middleware to localStorage, key `polish-me-up-cart`. Hydration-safe via `useSyncExternalStore`.

## 12. Lessons Learned

Notes captured during Phase 7B testing. They drove the follow-up migration `20260512120000_rls_customer_flow_fixes.sql` and should bias future schema work.

- **RLS write-side mirrors are mandatory, not optional.** The original migration covered SELECT thoroughly but skipped INSERT / UPDATE policies for tables that customers also write to (`customers`, `booking_items`, the cancel path on `bookings`). For every table a user can mutate, ship the read policy *and* the matching write policies in the same migration — otherwise reads work in staging and writes fail in browser testing.
- **UPDATE policies need both `USING` and `WITH CHECK`.** PostgreSQL evaluates `USING` against the existing row and `WITH CHECK` against the new row. A policy with only `USING` silently fails any UPDATE because the implicit `WITH CHECK` is `false`. The original `customers cancel own pending bookings` policy had this exact shape and blocked every cancel attempt with no error visible to the application. Always write both clauses, and think about whether the row is allowed to *transition* (e.g. pending → cancelled) in the WITH CHECK.
- **Server Components that auto-create rows need a matching INSERT policy.** The `/order` page bootstraps a `customers` row on first visit if the signed-in user doesn't already have one. The original RLS assumption was "manicurists create customer rows" — the customer flow can create them too, and the policy set has to allow that exact path (`profile_id = auth.uid()` on INSERT). When adding a new write-path in the app, audit the RLS policy set for that table at the same time.
- **`SECURITY DEFINER` functions must pin `search_path`.** The `handle_new_user` trigger that copies `auth.users` → `profiles` was failing silently because its `search_path` was implicit. Adding `set search_path = public` to the function definition fixed it. Treat `set search_path = public, pg_temp` as a default for every `security definer` function — without it the function inherits the caller's path and can be hijacked or fail in unexpected ways.