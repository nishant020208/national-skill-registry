-- Move trainer/principal/student to the institution with seeded students
UPDATE public.profiles SET institution_id = '145c7f04-5963-4806-bc7a-80be1e447e64'
  WHERE email IN ('trainer@credify.in','principal@credify.in','priya.welder@nsr.in');
UPDATE public.user_roles SET institution_id = '145c7f04-5963-4806-bc7a-80be1e447e64'
  WHERE user_id IN (SELECT user_id FROM public.profiles WHERE email IN ('trainer@credify.in','principal@credify.in','priya.welder@nsr.in'));
UPDATE public.students SET institution_id = '145c7f04-5963-4806-bc7a-80be1e447e64'
  WHERE id = 'a79fab19-a244-445d-b018-50954b911e66';