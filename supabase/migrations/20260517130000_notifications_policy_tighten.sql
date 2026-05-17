-- Migration: 20260517130000 - Tighten notifications insert policy.
--
-- The initial migration allowed any authenticated user to insert a notification
-- addressed to any other user. That's too permissive: a compromised customer
-- could spam fake notifications (with phishing links) to manicurists.
--
-- We replace it with a policy that only lets a user insert a notification
-- when:
--   1. They are the recipient (self-notifications, edge case but harmless), OR
--   2. The notification carries a booking_id and the inserter is either the
--      booking's customer or its manicurist (counterparty messaging).
--
-- Notifications inserted by background jobs / admin scripts go through the
-- service-role client which bypasses RLS entirely, so this doesn't break the
-- existing events.ts flow.

drop policy if exists "notifications_insert_authenticated" on public.notifications;

create policy "notifications_insert_counterparty"
  on public.notifications for insert
  to authenticated
  with check (
    -- self-insert
    recipient_profile_id = auth.uid()
    or (
      booking_id is not null
      and exists (
        select 1
        from public.bookings b
        left join public.customers c on c.id = b.customer_id
        left join public.manicurists m on m.id = b.manicurist_id
        where b.id = notifications.booking_id
          and (
            c.profile_id = auth.uid()
            or m.profile_id = auth.uid()
          )
      )
    )
  );
