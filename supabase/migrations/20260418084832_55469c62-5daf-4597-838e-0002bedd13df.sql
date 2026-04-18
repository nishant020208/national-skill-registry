-- ============ ENUM ============
CREATE TYPE public.app_role AS ENUM ('iti_admin', 'principal', 'trainer');
CREATE TYPE public.credential_status AS ENUM ('valid', 'revoked');

-- ============ INSTITUTIONS ============
CREATE TABLE public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

-- ============ WHITELIST ============
CREATE TABLE public.whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role public.app_role NOT NULL,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.whitelist ENABLE ROW LEVEL SECURITY;

-- ============ USER_ROLES (security-critical, separate table) ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role public.app_role NOT NULL,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ STUDENTS ============
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trade TEXT NOT NULL,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- ============ SKILLS ============
CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- ============ CREDENTIALS ============
CREATE TABLE public.credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE RESTRICT,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),
  issued_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  status public.credential_status NOT NULL DEFAULT 'valid',
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_credentials_student ON public.credentials(student_id);
CREATE INDEX idx_credentials_institution ON public.credentials(institution_id);

-- ============ CREDENTIAL_LOGS ============
CREATE TABLE public.credential_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID NOT NULL REFERENCES public.credentials(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.credential_logs ENABLE ROW LEVEL SECURITY;

-- ============ HAS_ROLE FUNCTION ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_institution(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT institution_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- ============ SIGNUP TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wl public.whitelist%ROWTYPE;
BEGIN
  SELECT * INTO wl FROM public.whitelist WHERE lower(email) = lower(NEW.email) AND is_used = false LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Email % is not whitelisted', NEW.email;
  END IF;

  INSERT INTO public.profiles (user_id, name, email, role, institution_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email, wl.role, wl.institution_id);

  INSERT INTO public.user_roles (user_id, role, institution_id)
  VALUES (NEW.id, wl.role, wl.institution_id);

  UPDATE public.whitelist SET is_used = true WHERE id = wl.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS POLICIES ============
-- institutions: public read, admin write
CREATE POLICY "institutions_public_read" ON public.institutions FOR SELECT USING (true);
CREATE POLICY "institutions_admin_insert" ON public.institutions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'iti_admin'));
CREATE POLICY "institutions_admin_update" ON public.institutions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'iti_admin'));
CREATE POLICY "institutions_admin_delete" ON public.institutions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'iti_admin'));

-- whitelist: only admins
CREATE POLICY "whitelist_admin_all" ON public.whitelist FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'iti_admin')) WITH CHECK (public.has_role(auth.uid(), 'iti_admin'));

-- user_roles: users see own, admins see all
CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'iti_admin'));

-- profiles: self read/update, admins/principals can read all
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'iti_admin') OR public.has_role(auth.uid(), 'principal'));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- students: public read (for verify page), trainers/principals/admins can write at their institution
CREATE POLICY "students_public_read" ON public.students FOR SELECT USING (true);
CREATE POLICY "students_staff_insert" ON public.students FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'iti_admin') OR
  ((public.has_role(auth.uid(), 'trainer') OR public.has_role(auth.uid(), 'principal')) AND institution_id = public.get_user_institution(auth.uid()))
);
CREATE POLICY "students_staff_update" ON public.students FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'iti_admin') OR
  ((public.has_role(auth.uid(), 'trainer') OR public.has_role(auth.uid(), 'principal')) AND institution_id = public.get_user_institution(auth.uid()))
);

-- skills: public read, admin write
CREATE POLICY "skills_public_read" ON public.skills FOR SELECT USING (true);
CREATE POLICY "skills_admin_write" ON public.skills FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'iti_admin')) WITH CHECK (public.has_role(auth.uid(), 'iti_admin'));

-- credentials: public read (for QR verify), trainers issue at own institution, principals/admins update
CREATE POLICY "credentials_public_read" ON public.credentials FOR SELECT USING (true);
CREATE POLICY "credentials_trainer_insert" ON public.credentials FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'iti_admin') OR
  ((public.has_role(auth.uid(), 'trainer') OR public.has_role(auth.uid(), 'principal')) AND institution_id = public.get_user_institution(auth.uid()))
);
CREATE POLICY "credentials_staff_update" ON public.credentials FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'iti_admin') OR
  (public.has_role(auth.uid(), 'principal') AND institution_id = public.get_user_institution(auth.uid()))
);

-- credential_logs: public read (for transparency), authenticated insert
CREATE POLICY "credential_logs_public_read" ON public.credential_logs FOR SELECT USING (true);
CREATE POLICY "credential_logs_auth_insert" ON public.credential_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = performed_by);

-- ============ SEED SKILLS ============
INSERT INTO public.skills (name, description) VALUES
  ('CNC Lathe Operation', 'Operating computer-numerical-control lathe machines'),
  ('CNC Milling', 'Programming and operating CNC milling machines'),
  ('Manual Lathe', 'Conventional lathe machining operations'),
  ('Arc Welding (SMAW)', 'Shielded metal arc welding techniques'),
  ('TIG Welding', 'Tungsten inert gas welding'),
  ('MIG Welding', 'Metal inert gas welding'),
  ('Electrical Wiring', 'Domestic and industrial electrical wiring'),
  ('PLC Programming', 'Programmable logic controller programming'),
  ('Hydraulics & Pneumatics', 'Fluid power systems'),
  ('AutoCAD 2D/3D', 'Computer-aided drafting and design'),
  ('Sheet Metal Fabrication', 'Cutting, bending, and assembling sheet metal'),
  ('Plumbing', 'Pipe fitting and plumbing systems'),
  ('Refrigeration & AC', 'HVAC installation and repair'),
  ('Diesel Mechanics', 'Diesel engine maintenance and repair'),
  ('Industrial Safety', 'Workplace safety practices and PPE');
