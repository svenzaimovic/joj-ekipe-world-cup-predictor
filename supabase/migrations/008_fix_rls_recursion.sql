-- Fix infinite recursion in league_members RLS policy.
-- The original policy checked league_members from within league_members,
-- causing Postgres to recurse indefinitely.
-- Users only need to see their own membership rows; the leagues policy
-- and the league_leaderboard() function (SECURITY DEFINER) handle the rest.
DROP POLICY IF EXISTS "league_members_select" ON league_members;
CREATE POLICY "league_members_select" ON league_members
  FOR SELECT TO authenticated USING (user_id = auth.uid());
