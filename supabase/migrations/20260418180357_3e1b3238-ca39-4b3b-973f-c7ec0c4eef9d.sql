
ALTER TABLE public.credential_requests
  ADD CONSTRAINT credential_requests_student_fk FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE,
  ADD CONSTRAINT credential_requests_skill_fk FOREIGN KEY (skill_id) REFERENCES public.skills(id) ON DELETE CASCADE,
  ADD CONSTRAINT credential_requests_credential_fk FOREIGN KEY (credential_id) REFERENCES public.credentials(id) ON DELETE SET NULL,
  ADD CONSTRAINT credential_requests_institution_fk FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;

ALTER TABLE public.scan_logs
  ADD CONSTRAINT scan_logs_student_fk FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
