-- Move trainer + principal to ITI Institute 9 so they manage seeded students
DO $$
DECLARE inst9 uuid;
BEGIN
  SELECT id INTO inst9 FROM public.institutions WHERE name = 'ITI Institute 9';
  UPDATE public.profiles SET institution_id = inst9
    WHERE email IN ('trainer@credify.in','principal@credify.in');
  UPDATE public.user_roles SET institution_id = inst9
    WHERE user_id IN (SELECT user_id FROM public.profiles WHERE email IN ('trainer@credify.in','principal@credify.in'));

  -- Whitelist Priya so she can sign up via the existing auth flow
  INSERT INTO public.whitelist (email, role, institution_id, is_used)
  VALUES ('priya.welder@nsr.in', 'student', inst9, false)
  ON CONFLICT DO NOTHING;
END $$;