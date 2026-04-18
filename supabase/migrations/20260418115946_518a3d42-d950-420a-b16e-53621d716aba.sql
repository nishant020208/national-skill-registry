INSERT INTO storage.buckets (id, name, public) VALUES ('seed-data', 'seed-data', false)
ON CONFLICT (id) DO NOTHING;