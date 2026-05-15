# Polish Me Up!

> Spa-quality manicure & pedicure services delivered to your location - home, booth, or any venue.

A full-stack booking platform for a remote nail salon, built with Next.js 16, Supabase, and TypeScript. Customers browse packages, pin their address on a hybrid Mapbox + Google Maps picker, and book a manicurist; the salon owner manages bookings, customers, items, sales, and availability from a dedicated studio.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) |
| Language | **TypeScript** (strict) |
| Styling | **Tailwind CSS v4** + **shadcn/ui** (Radix preset, Nova theme) |
| Database / Auth | **Supabase** (PostgreSQL + Auth + Storage), new key format (`sb_publishable_...` / `sb_secret_...`) |
| State | **Zustand** (cart) + **TanStack Query** |
| Forms | **React Hook Form** + **Zod** |
| Maps - tiles | **Mapbox GL JS** - visual map + draggable rose marker |
| Maps - search | **Google Places API (New)** + **Google Geocoding API** - autocomplete, reverse-geocode, building/POI detection |
| Charts | **Recharts** *(deferred - not used in MVP)* |
| Icons | **Lucide React** (no emojis) |
| CSV | **PapaParse** |

No `src/` directory - `app/`, `components/`, `lib/`, `store/`, `types/` live at the project root. Path alias `@/*` → project root.

---

## Quick start

### 1. Clone and install
```powershell
git clone <repo-url>
cd polish-me-up
npm install
```

### 2. Environment variables
Create `.env` at the project root:
```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```

The Google key needs **Places API (New)** and **Geocoding API** enabled in Google Cloud (Application restrictions → HTTP referrers; API restrictions → those two APIs). Free tier covers normal usage.

### 3. Apply database migrations
Push the SQL files in `supabase/migrations/` to your project - either via the Supabase CLI:
```powershell
npx supabase login                                      # one-time
npx supabase link --project-ref <your-project-ref>      # one-time
npx supabase db push
```
…or paste each migration into the **SQL Editor** of the Supabase dashboard.

After applying, regenerate types:
```powershell
npx supabase gen types typescript --linked > types/database.types.ts
```

### 4. Start the dev server
```powershell
npm run dev
```
Open <http://localhost:3000>.

---

## User roles

| Role | Can do |
|---|---|
| **Customer** | Browse packages, choose walk-in or mobile, pin a Malaysia address (autocomplete + click-to-drop + building/POI detection), save addresses as Home / Work / custom for one-click recall, book + cancel pending appointments, view scheduled / past bookings. |
| **Manicurist** | Full studio access: dashboard KPIs, today's appointments, bookings management with status transitions, customers CRUD + manual entry (Option A), items CRUD with up to 3 images per item, sales analytics with source filters, weekly schedule with multiple time windows + date overrides, CSV exports, embedded Mapbox preview + Google Maps link for each mobile booking. |

---

## Customer booking flow

```
/                          Public landing (manicurists auto-redirect to /dashboard)
   ↓ Book Now
/order/start               Choose Walk-in or Mobile
   ├─ Walk-in ─────────→  /packages?mode=walkin
   └─ Mobile  ─────────→  /order/address  (Google autocomplete + Mapbox map)
                              ↓
                          /packages?mode=mobile
                              ↓ add to cart
                    /login (if guest) → /order
/order                     Date · time (gated by manicurist availability) · manicurist · notes · discounts
   ↓ confirm
/confirm/[bookingId]       "Waiting for confirmation" banner + summary
   ↓
/my-bookings               Scheduled (upcoming) + History (past dates)
```

The cart (`store/cartStore.ts`) is persisted to `localStorage` (`polish-me-up-cart`). Switching modes mid-cart prompts a confirm and clears items. Saved addresses live in the `saved_addresses` table and are recalled as Home / Work / custom chips on the address picker.

---

## Pricing model

The `items` table tags each row with a `service_mode` enum (`mobile | walkin | both`). Add-ons sit in `both`. Reseed lives in `supabase/migrations/20260513000000_service_mode_geo_schedule.sql`.

| Item | Category | Mode | Price (MYR) |
|---|---|---|---|
| Manicure | package | mobile | 30 |
| Pedicure | package | mobile | 35 |
| Mani + Pedi | package | mobile | 55 |
| Mani + Hand Spa | package | mobile | 60 |
| Pedi + Foot Spa | package | mobile | 70 |
| Manicure (Walk-in) | package | walkin | 25 |
| Press-on Nails (Short / Medium / Long) | addon | both | 15 / 30 / 45 |
| Gel | addon | both | 45 |
| Nail Kit (Small / Large) | addon | both | 35 / 45 |

Students with an educational email (domain contains `edu`) get a flat **10 %** off the order total - applied centrally in `lib/utils/calculateDiscount.ts`.

---

## Address picker (`/order/address`)

The picker uses Mapbox for the visual map and Google for the address text:

| Action | What happens |
|---|---|
| Typing in the search box | Debounced 200 ms call to Google **Places Autocomplete (New)**, biased to Malaysia + KL area. Suggestions render in a custom rose dropdown. |
| Picking a suggestion | Google **Place Details** returns coords + structured `addressComponents`. Marker placed, map flies to zoom 16. |
| Clicking anywhere on the map | Two parallel Google calls: **Geocoding API** (street/area/postcode) + **Places searchNearby** filtered for building-scale types (`lodging`, `shopping_mall`, `hospital`, `mosque`, etc.). If a building is found within 50 m, its name is prepended as the top line of the address. |
| Dragging the pink pin | Same flow as clicking. |
| Clicking a saved chip (Home / Work / …) | Marker + map snap to the saved coords; input syncs to the saved label. |

Addresses are formatted into a Malaysian 3-line layout (or 4 with a building):

```
Pavilion Kuala Lumpur                         ← building (when applicable)
168, Jalan Bukit Bintang                      ← street_number + route
Bukit Bintang                                 ← neighborhood / sublocality / district
55100 Kuala Lumpur, Wilayah Persekutuan KL    ← postcode + locality + state
```

A separate "Additional info" textarea (gate code, unit colour, parking notes) is stored in the cart and merged into `bookings.notes` at checkout - it never touches the address text or the map.

---

## Database schema

12 tables under the `public` schema. RLS is on for every table; helper function `is_manicurist()` guards admin policies.

- `profiles` - extends `auth.users` with `full_name`, `phone`, `is_student`, `role` enum (`customer | manicurist`).
- `customers` - booking-side customer record, `profile_id` nullable for manual entries.
- `manicurists` - service-provider record, one row per manicurist profile (auto-bootstrapped on first login, `UNIQUE(profile_id)`).
- `manicurist_weekly_schedule` - per-weekday open hours; multiple windows allowed per day (e.g. 09:00-12:00 + 14:00-18:00).
- `manicurist_date_overrides` - per-date closures **or** custom hours.
- `manicurist_availability` - legacy slot table (currently unused by the live flow).
- `items` - packages and add-ons. `photo_urls text[]` (up to 3) backed by Supabase Storage bucket `service-images`.
- `bookings` - `service_mode`, `manicurist_id`, `address` + `address_lat / lng` for mobile, status & payment_status enums, `source` (`system | manual`).
- `booking_items` - line items with snapshot `unit_price`.
- `sales` - generated `net_sales` and `gross_profit` columns.
- `saved_addresses` - customer's Home / Work / custom labels for one-click recall on the address picker.
- `promotions` - schema present, UI deferred.

---

## Authentication & authorization

`proxy.ts` at the project root only refreshes Supabase session cookies via `updateSession`. **All authorization happens in Server Component layouts** (`app/(customer)/layout.tsx`, `app/(manicurist)/layout.tsx`) - per Next.js 16 guidance and the 2025 middleware advisory.

The public landing `/` (`app/page.tsx`) does an extra role check: signed-in **manicurists** are redirected to `/dashboard` so they never see the customer-facing homepage.

Two Supabase clients:
- `lib/supabase/server.ts` - server components and route handlers (uses cookies).
- `lib/supabase/client.ts` - browser client components (publishable key only).

Never expose `SUPABASE_SECRET_KEY` to client code.

---

## Available scripts

```powershell
npm run dev      # Start dev server (Turbopack)
npm run build    # Production build
npm start        # Run the production build
npm run lint     # ESLint
```

Helper one-offs:
- `scripts/upload-homepage-images.mjs` - re-uploads the three homepage hero photos to Supabase Storage from your OS temp dir.

---

## Project layout

```
app/
├── page.tsx                       # Public landing (redirects manicurists → /dashboard)
├── (auth)/
│   ├── layout.tsx                 # Pastel auth shell
│   ├── login/page.tsx
│   └── register/page.tsx          # Auto-detects edu emails for student discount
├── (public)/
│   ├── layout.tsx                 # Public shell (header + pastel bg)
│   ├── packages/page.tsx          # Mode-aware menu
│   └── order/
│       ├── start/page.tsx         # Walk-in vs Mobile chooser
│       └── address/page.tsx       # Google autocomplete + Mapbox map + saved chips
├── (customer)/                    # Auth-gated
│   ├── order/page.tsx             # Final checkout
│   ├── confirm/[bookingId]/page.tsx
│   └── my-bookings/page.tsx       # Scheduled + History
└── (manicurist)/                  # Manicurist-only (sidebar layout)
    ├── dashboard/page.tsx
    ├── bookings/page.tsx
    ├── customers/...
    ├── items/...
    ├── sales/page.tsx
    └── availability/page.tsx
components/
├── animations/                    # BlurFade, AnimatedGradientText, Sparkles
├── customer/                      # AddToCartButton, CartIndicator, AddressPicker, ...
├── manicurist/                    # SidebarNav, StatsCard, PageHeader, DataTable, MiniMap, ImageDropzone, ...
├── shared/                        # SiteHeader, SiteHeaderNav, SignOutButton
└── ui/                            # shadcn primitives
lib/
├── supabase/                      # client.ts, server.ts, middleware.ts
├── utils/                         # calculateDiscount, formatPrice, csvExport
└── validations/                   # Zod schemas (auth, booking, item, ...)
store/
└── cartStore.ts                   # Zustand cart with persist (mode + address + notes)
supabase/
├── migrations/                    # All schema changes, in chronological order
└── seed_manicurist.sql
scripts/
└── upload-homepage-images.mjs     # One-off Supabase Storage uploader
types/
└── database.types.ts              # Generated by `supabase gen types`
```

---

## Design system

- **Pastel-pink palette with high-contrast accents:**
  - Primary CTA: gradient `#EC4899 → #DB2777`
  - Hover: `#BE185D`
  - Surface borders: `#F8BBD0`
  - Background gradient: `#FFF5F8 → #FFE4EC → #FFD1DC`
  - Text: `#3D1A2A` (body) / `#5C2D48` (muted) / `#BE3D7E` (accent)
- **Animations** (built locally, no extra deps): `BlurFade` (IntersectionObserver), `AnimatedGradientText` / `ShinyText` (CSS keyframes), `Sparkles` (drifting pastel dots), click-driven sliding pill on the top + side navs.
- No emojis in UI - Lucide icons only.

---

## License

Private - coursework / internal project.
