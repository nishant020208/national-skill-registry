-- Clear any other accidental link, then attach Priya's auth user to the specific seeded student
UPDATE public.students SET user_id = NULL
  WHERE user_id = '93f94f8d-2e16-4a40-bf0b-ee158b4db123';

UPDATE public.students SET user_id = '93f94f8d-2e16-4a40-bf0b-ee158b4db123'
  WHERE id = 'a79fab19-a244-445d-b018-50954b911e66';