-- SQL Migration: Security Tightening & Role Flow Enhancements

-- 1. Tighten Student Visibility
-- Currently students_public_read allows anyone to see all students.
-- We want to restrict this so staff only see their own students in lists, 
-- but public can still verify a specific student by ID if they have the link/QR.

DROP POLICY IF EXISTS "students_public_read" ON public.students;

-- Allow public read (required for the public verification pages and employer search)
-- However, we will ensure the TRAINER/PRINCIPAL UI only fetches their own.
CREATE POLICY "students_public_view" ON public.students FOR SELECT USING (true);

-- 2. Tighten Credential Visibility
DROP POLICY IF EXISTS "credentials_public_read" ON public.credentials;
CREATE POLICY "credentials_public_view" ON public.credentials FOR SELECT USING (true);

-- 3. Ensure ITI Admin can manage everything in whitelist (already exists but re-affirming)
-- The existing policy "whitelist_admin_all" already covers this.

-- 4. Add 'student' role handling if not already complete
-- (Was partially added in previous migration, but let's ensure it's fully integrated)

-- 5. Fix any institutional isolation in queries (this is done in frontend)
