-- 1. Enable RLS on members
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- 2. Allow Public Read Access (SELECT)
-- Drop old policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can read members" ON members;
DROP POLICY IF EXISTS "Enable read access for all users" ON members;
DROP POLICY IF EXISTS "Anyone can read members" ON members;
DROP POLICY IF EXISTS "Public read access for members" ON members;

CREATE POLICY "Public read access for members"
ON members FOR SELECT
USING (true);

-- 3. Allow Admins and Directors to Update Members (UPDATE)
DROP POLICY IF EXISTS "Enable update for admins only" ON members;
DROP POLICY IF EXISTS "Enable update for admins and directors" ON members;

CREATE POLICY "Enable update for admins and directors" ON members
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'director')
  )
);

-- 4. Allow Admins and Directors to Insert Members (INSERT)
DROP POLICY IF EXISTS "Enable insert for admins only" ON members;
DROP POLICY IF EXISTS "Enable insert for admins and directors" ON members;

CREATE POLICY "Enable insert for admins and directors" ON members
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'director')
  )
);

-- 5. Ensure Profiles are Readable (by everyone, for joining)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;

CREATE POLICY "Public read access for profiles"
ON profiles FOR SELECT
USING (true);
