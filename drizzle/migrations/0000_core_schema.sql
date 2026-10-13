CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE public.sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  cursor jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  records_seen int NOT NULL DEFAULT 0,
  records_new int NOT NULL DEFAULT 0,
  records_changed int NOT NULL DEFAULT 0,
  error text
);
GRANT SELECT ON public.sync_runs TO authenticated;
GRANT ALL ON public.sync_runs TO service_role;
ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read sync" ON public.sync_runs FOR SELECT TO authenticated USING (true);

CREATE TABLE public.tenders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_id text NOT NULL,
  ocid text,
  nomenclature text,
  call_number text,
  title text NOT NULL,
  description text,
  entity text,
  object_type text,
  procedure_type text,
  selection_modality text,
  currency text,
  amount numeric,
  amount_level text NOT NULL DEFAULT 'procedimiento',
  published_at timestamptz,
  participation_start timestamptz,
  participation_end timestamptz,
  closing_at timestamptz,
  closing_date_only boolean NOT NULL DEFAULT false,
  regions text[] NOT NULL DEFAULT '{}',
  cubso_segments text[] NOT NULL DEFAULT '{}',
  cubso_labels text[] NOT NULL DEFAULT '{}',
  source_url text,
  schedule jsonb,
  detail_fetched_at timestamptz,
  source_hash text,
  version int NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_checked_at timestamptz NOT NULL DEFAULT now(),
  listed_in_source boolean NOT NULL DEFAULT true,
  UNIQUE (source, source_id)
);
GRANT SELECT ON public.tenders TO authenticated;
GRANT ALL ON public.tenders TO service_role;
ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read tenders" ON public.tenders FOR SELECT TO authenticated USING (true);
CREATE INDEX tenders_closing_idx ON public.tenders (closing_at);
CREATE INDEX tenders_published_idx ON public.tenders (published_at);
CREATE INDEX tenders_regions_idx ON public.tenders USING gin (regions);
CREATE INDEX tenders_segments_idx ON public.tenders USING gin (cubso_segments);
CREATE INDEX tenders_object_idx ON public.tenders (object_type);
CREATE INDEX tenders_title_trgm ON public.tenders USING gin (title gin_trgm_ops);
CREATE INDEX tenders_desc_trgm ON public.tenders USING gin (description gin_trgm_ops);
CREATE INDEX tenders_entity_trgm ON public.tenders USING gin (entity gin_trgm_ops);

CREATE TABLE public.tender_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  item_number text NOT NULL,
  description text,
  cubso_code text,
  cubso_label text,
  quantity text,
  unit text,
  currency text,
  amount numeric,
  item_type text,
  status_code text,
  region text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tender_id, item_number)
);
GRANT SELECT ON public.tender_items TO authenticated;
GRANT ALL ON public.tender_items TO service_role;
ALTER TABLE public.tender_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read items" ON public.tender_items FOR SELECT TO authenticated USING (true);

CREATE TABLE public.source_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid REFERENCES public.tenders(id) ON DELETE CASCADE,
  source text NOT NULL,
  source_id text NOT NULL,
  kind text NOT NULL DEFAULT 'listing',
  url text,
  hash text NOT NULL,
  payload jsonb NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_id, kind, hash)
);
GRANT SELECT ON public.source_records TO authenticated;
GRANT ALL ON public.source_records TO service_role;
ALTER TABLE public.source_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read records" ON public.source_records FOR SELECT TO authenticated USING (true);

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  source_code text NOT NULL,
  doc_type text,
  file_name text,
  extension text,
  size_label text,
  stage text,
  published_at timestamptz,
  url text NOT NULL,
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tender_id, source_code)
);
GRANT SELECT ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read docs" ON public.documents FOR SELECT TO authenticated USING (true);

CREATE TABLE public.document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  locator text,
  content text NOT NULL,
  UNIQUE (document_id, chunk_index)
);
GRANT SELECT ON public.document_chunks TO authenticated;
GRANT ALL ON public.document_chunks TO service_role;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read chunks" ON public.document_chunks FOR SELECT TO authenticated USING (true);

CREATE TABLE public.company_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid(),
  business_name text,
  ruc text,
  keywords text[] NOT NULL DEFAULT '{}',
  offerings text,
  regions text[] NOT NULL DEFAULT '{}',
  capacity_amount numeric,
  capacity_currency text DEFAULT 'PEN',
  experience jsonb NOT NULL DEFAULT '[]',
  staff text,
  certifications text,
  availability text,
  restrictions text,
  rnp_registrations text,
  rnp_declared_at date,
  version int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.company_profiles TO authenticated;
GRANT ALL ON public.company_profiles TO service_role;
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.company_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own profile insert" ON public.company_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own profile update" ON public.company_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.company_profile_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  version int NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, version)
);
GRANT SELECT ON public.company_profile_versions TO authenticated;
GRANT ALL ON public.company_profile_versions TO service_role;
ALTER TABLE public.company_profile_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own versions" ON public.company_profile_versions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.profile_versioning() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.user_id := OLD.user_id;
    NEW.version := OLD.version + 1;
  ELSE
    NEW.user_id := auth.uid();
    NEW.version := 1;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER profile_versioning_before BEFORE INSERT OR UPDATE ON public.company_profiles
FOR EACH ROW EXECUTE FUNCTION public.profile_versioning();

CREATE OR REPLACE FUNCTION public.profile_snapshot() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.company_profile_versions (profile_id, user_id, version, snapshot)
  VALUES (NEW.id, NEW.user_id, NEW.version, to_jsonb(NEW));
  RETURN NEW;
END $$;
CREATE TRIGGER profile_snapshot_after AFTER INSERT OR UPDATE ON public.company_profiles
FOR EACH ROW EXECUTE FUNCTION public.profile_snapshot();

CREATE TABLE public.saved_tenders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tender_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_tenders TO authenticated;
GRANT ALL ON public.saved_tenders TO service_role;
ALTER TABLE public.saved_tenders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saved select" ON public.saved_tenders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own saved insert" ON public.saved_tenders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own saved delete" ON public.saved_tenders FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.analysis_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  profile_version int,
  tender_version int,
  status text NOT NULL DEFAULT 'en_cola',
  progress jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.analysis_jobs TO authenticated;
GRANT ALL ON public.analysis_jobs TO service_role;
ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own jobs" ON public.analysis_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.analysis_jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  profile_version int,
  tender_version int,
  score int,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.analyses TO authenticated;
GRANT ALL ON public.analyses TO service_role;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own analyses" ON public.analyses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX analyses_user_tender ON public.analyses (user_id, tender_id, created_at DESC);