-- Allow any authenticated user to create a member record
-- This is necessary for the signup flow where the user creates their own member profile immediately after sign up.

DROP POLICY IF EXISTS "Authenticated users can insert members" ON members;

CREATE POLICY "Authenticated users can insert members"
ON members FOR INSERT
TO authenticated
WITH CHECK (true);

-- Ensure profiles can also be inserted (usually this is already covered, but good to ensure)
-- Existing policy "Users can insert own profile" covers this found in 002_rls_policies.sql
