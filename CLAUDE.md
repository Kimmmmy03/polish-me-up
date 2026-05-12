# Polish Me Up — Project Conventions

## Always read first
- `ARCHITECTURE.md` at project root — the source of truth for tech stack, schema, file structure, and decisions
- `types/database.types.ts` — generated Supabase types, never edit by hand

## Stack reminders
- Next.js 16 App Router, NO src/ directory (files are at root: `app/`, `components/`, `lib/`)
- TypeScript strict
- Tailwind v4 + shadcn/ui (Radix preset, Nova theme, Lucide icons)
- Supabase with NEW API key format: `sb_publishable_...` and `sb_secret_...`
- Path alias: `@/*` resolves to project root

## Conventions
- Use `lib/supabase/server.ts` in Server Components and Route Handlers
- Use `lib/supabase/client.ts` in Client Components only
- NEVER expose `SUPABASE_SECRET_KEY` to client code
- `proxy.ts` (root) is for Supabase session cookie refresh ONLY — never put authorization or role-based redirects there. Per Next.js 16 guidance and a 2025 security advisory, middleware/proxy is unsafe for auth gating. Do role checks inside Server Component layouts (`app/(manicurist)/layout.tsx`, `app/(customer)/layout.tsx`) and re-verify the session inside sensitive Route Handlers before mutations.
- All forms validated with Zod schemas in `lib/validations/`
- Centralize price math in `lib/utils/calculateDiscount.ts` — used identically on client (preview) and server (insert)
- No emojis in UI — Lucide icons only
- Pink palette: primary #E91E63, soft-rose #F8BBD0, blush-beige #FDF2F4, charcoal #2D2D2D

## Two parallel Zod schemas per entity
- `bookingSystemSchema` (strict, future dates only, manicurist required) for live customer flow
- `bookingManualSchema` (relaxed, any date, manicurist optional) for manicurist backfill
- Same pattern for customers and sales

## Source tagging
- `bookings`, `customers`, `sales` all have `source` enum: `'system'` (live booking) or `'manual'` (backfilled)
- Every list view and analytics query supports filtering by source

## MVP scope (defer for v1.1)
- Skip: promotions, manicurist availability calendar, Realtime, email confirmations, complex analytics
- Include: auth, manual entry (Options A & B), CSV import (Option C), customer booking flow, basic dashboard
- Defer Option D (merge-on-signup) until after auth flow is stable