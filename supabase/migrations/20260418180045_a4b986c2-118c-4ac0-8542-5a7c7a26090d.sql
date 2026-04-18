
-- 1. Extend credential_status enum
ALTER TYPE public.credential_status ADD VALUE IF NOT EXISTS 'pending_trainer';
ALTER TYPE public.credential_status ADD VALUE IF NOT EXISTS 'pending_principal';
ALTER TYPE public.credential_status ADD VALUE IF NOT EXISTS 'rejected';

-- 2. Approval columns on credentials
ALTER TABLE public.credentials
  ADD COLUMN IF NOT EXISTS trainer_approved_by uuid,
  ADD COLUMN IF NOT EXISTS trainer_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS principal_approved_by uuid,
  ADD COLUMN IF NOT EXISTS principal_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 3. credential_requests table (student-initiated requests)
CREATE TABLE IF NOT EXISTS public.credential_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  skill_id uuid NOT NULL,
  requested_level int NOT NULL CHECK (requested_level BETWEEN 1 AND 4),
  evidence_url text,
  note text,
  status text NOT NULL DEFAULT 'pending_trainer',
  -- pending_trainer | pending_principal | approved | rejected
  trainer_id uuid,
  trainer_action_at timestamptz,
  principal_id uuid,
  principal_action_at timestamptz,
  rejection_reason text,
  credential_id uuid,
  institution_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credreq_inst_status ON public.credential_requests (institution_id, status);
CREATE INDEX IF NOT EXISTS idx_credreq_student ON public.credential_requests (student_id);

ALTER TABLE public.credential_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credreq_student_insert" ON public.credential_requests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));

CREATE POLICY "credreq_read" ON public.credential_requests FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'iti_admin')
    OR ((public.has_role(auth.uid(), 'trainer') OR public.has_role(auth.uid(), 'principal'))
        AND institution_id = public.get_user_institution(auth.uid()))
  );

CREATE POLICY "credreq_staff_update" ON public.credential_requests FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'iti_admin')
    OR ((public.has_role(auth.uid(), 'trainer') OR public.has_role(auth.uid(), 'principal'))
        AND institution_id = public.get_user_institution(auth.uid()))
  );

-- 4. scan_logs table
CREATE TABLE IF NOT EXISTS public.scan_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  scanner_label text,
  user_agent text
);
CREATE INDEX IF NOT EXISTS idx_scan_student ON public.scan_logs (student_id, scanned_at DESC);

ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scan_public_insert" ON public.scan_logs FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "scan_read" ON public.scan_logs FOR SELECT TO authenticated, anon
  USING (true);

-- 5. Certificates storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "cert_student_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "cert_owner_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "cert_staff_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'certificates' AND (
    public.has_role(auth.uid(), 'iti_admin')
    OR public.has_role(auth.uid(), 'trainer')
    OR public.has_role(auth.uid(), 'principal')
  ));
