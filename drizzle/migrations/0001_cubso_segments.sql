CREATE TABLE public.cubso_segments (
  code text PRIMARY KEY,
  title text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cubso_segments TO authenticated;
GRANT ALL ON public.cubso_segments TO service_role;
ALTER TABLE public.cubso_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read segments" ON public.cubso_segments FOR SELECT TO authenticated USING (true);