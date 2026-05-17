-- Migration: 20260517120000 - In-app notifications.
--
-- Replaces the previous Resend-based email pipeline. Notifications are now
-- written into this table by server actions (e.g. notifyBookingCreated) and
-- streamed to the client via the Supabase Realtime channel on
-- public.notifications. The bell icon in the layouts subscribes per user.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  booking_id uuid references public.bookings(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_profile_id, read_at, created_at desc);

alter table public.notifications enable row level security;

-- A profile can read and update only its own notifications.
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (recipient_profile_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (recipient_profile_id = auth.uid())
  with check (recipient_profile_id = auth.uid());

-- Inserts are allowed for any signed-in user. This is intentional: server
-- actions running as the acting user need to be able to insert notifications
-- addressed to the *counterparty* of a booking (customer notifies manicurist
-- when cancelling, manicurist notifies customer on status change). The set
-- of valid recipients is constrained by foreign key and by the calling
-- server action which only inserts for the booking's customer / manicurist.
drop policy if exists "notifications_insert_authenticated" on public.notifications;
create policy "notifications_insert_authenticated"
  on public.notifications for insert
  to authenticated
  with check (true);

-- Enable realtime broadcasts for this table.
alter publication supabase_realtime add table public.notifications;
