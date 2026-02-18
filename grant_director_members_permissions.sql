-- Enable RLS on members (if not already)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts or confusion (optional, but cleaner)
DROP POLICY IF EXISTS "Enable insert for admins only" ON members;
DROP POLICY IF EXISTS "Enable update for admins only" ON members;
DROP POLICY IF EXISTS "Enable delete for admins only" ON members;

-- Create new policies including Directors

-- INSERT
CREATE POLICY "Enable insert for admins and directors" ON members
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'director')
  )
);

-- UPDATE
CREATE POLICY "Enable update for admins and directors" ON members
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'director')
  )
);

-- DELETE
CREATE POLICY "Enable delete for admins and directors" ON members
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'director')
  )
);

-- Ensure SELECT is still open (usually it is, but good to double check or reaffirm)
-- Assuming "Enable read access for all users" exists from 002_rls_policies.sql
-- If not, we could add it here too, but usually SELECT is less restrictive.
