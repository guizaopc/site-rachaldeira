-- Allow public read access to members table
-- This fixes the issue where the public "Integrantes" page is empty for non-logged users
-- and ensures better visibility of the squad list.

DROP POLICY IF EXISTS "Authenticated users can read members" ON members;

CREATE POLICY "Anyone can read members"
  ON members FOR SELECT
  USING (true);

-- Also ensure profiles are readable if joined
DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;
CREATE POLICY "Anyone can read profiles"
  ON profiles FOR SELECT
  USING (true);
