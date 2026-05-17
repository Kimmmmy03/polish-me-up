-- Migration: 20260517140000 - Indexes on hot FK / filter columns.
--
-- Postgres does NOT auto-index foreign key columns. Every query that joins or
-- filters by these columns currently does a seq scan. The dashboard, bookings
-- view, and sales view all filter by manicurist_id; the notifications insert
-- policy joins through bookings → customers/manicurists by profile_id.

create index if not exists bookings_manicurist_id_idx
  on public.bookings (manicurist_id);

create index if not exists bookings_customer_id_idx
  on public.bookings (customer_id);

create index if not exists bookings_booking_date_idx
  on public.bookings (booking_date desc);

create index if not exists booking_items_booking_id_idx
  on public.booking_items (booking_id);

create index if not exists sales_booking_id_idx
  on public.sales (booking_id);

create index if not exists sales_date_idx
  on public.sales (date desc);

create index if not exists customers_profile_id_idx
  on public.customers (profile_id);

create index if not exists notifications_booking_id_idx
  on public.notifications (booking_id);
