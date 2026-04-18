-- 1. Add 'student' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'student';

-- 2. Link students to optional auth user
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_name_trade ON public.students USING gin (to_tsvector('simple', name || ' ' || trade));

-- 3. Reassessment requests table
CREATE TABLE IF NOT EXISTS public.reassessment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  credential_id uuid REFERENCES public.credentials(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  requested_by uuid,
  institution_id uuid REFERENCES public.institutions(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reassessment_requests ENABLE ROW LEVEL SECURITY;

-- Student can insert their own request
CREATE POLICY "reassessment_student_insert" ON public.reassessment_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
  );

-- Student can view their own; staff at the institution + admin can view all
CREATE POLICY "reassessment_read" ON public.reassessment_requests
  FOR SELECT TO authenticated
  USING (
    requested_by = auth.uid()
    OR public.has_role(auth.uid(), 'iti_admin'::app_role)
    OR (public.has_role(auth.uid(), 'principal'::app_role) AND institution_id = public.get_user_institution(auth.uid()))
    OR (public.has_role(auth.uid(), 'trainer'::app_role) AND institution_id = public.get_user_institution(auth.uid()))
  );

-- Staff can update status
CREATE POLICY "reassessment_staff_update" ON public.reassessment_requests
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'iti_admin'::app_role)
    OR (public.has_role(auth.uid(), 'principal'::app_role) AND institution_id = public.get_user_institution(auth.uid()))
    OR (public.has_role(auth.uid(), 'trainer'::app_role) AND institution_id = public.get_user_institution(auth.uid()))
  );

-- 4. Update handle_new_user to link student profile if their email matches a whitelisted student
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  wl public.whitelist%ROWTYPE;
  matched_student_id uuid;
BEGIN
  SELECT * INTO wl FROM public.whitelist WHERE lower(email) = lower(NEW.email) AND is_used = false LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Email % is not whitelisted', NEW.email;
  END IF;

  INSERT INTO public.profiles (user_id, name, email, role, institution_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email, wl.role, wl.institution_id);

  INSERT INTO public.user_roles (user_id, role, institution_id)
  VALUES (NEW.id, wl.role, wl.institution_id);

  -- If student role, try to link to an existing student record by name (best-effort)
  IF wl.role = 'student' THEN
    SELECT id INTO matched_student_id FROM public.students
      WHERE institution_id = wl.institution_id
        AND lower(name) = lower(COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)))
      LIMIT 1;
    IF matched_student_id IS NOT NULL THEN
      UPDATE public.students SET user_id = NEW.id WHERE id = matched_student_id;
    END IF;
  END IF;

  UPDATE public.whitelist SET is_used = true WHERE id = wl.id;
  RETURN NEW;
END;
$function$;

-- 5. Ensure trigger exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();