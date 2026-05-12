-- Seed one manicurist row.
--
-- Run this in the Supabase SQL Editor after you have at least one profile
-- with role = 'manicurist'. Promote your own account first if needed:
--
--   UPDATE profiles SET role = 'manicurist' WHERE email = 'you@example.com';
--
-- Then this insert grabs the first manicurist profile and creates an active
-- manicurists row for them.

INSERT INTO public.manicurists (profile_id, bio, specialties, rating, total_jobs, is_active)
SELECT
  p.id,
  'Founder & lead manicurist.',
  ARRAY['gel', 'pedicure', 'nail art']::text[],
  5.0,
  0,
  true
FROM public.profiles p
WHERE p.role = 'manicurist'
  AND NOT EXISTS (
    SELECT 1 FROM public.manicurists m WHERE m.profile_id = p.id
  )
LIMIT 1;
