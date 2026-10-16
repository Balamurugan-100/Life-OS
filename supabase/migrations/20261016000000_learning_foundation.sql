-- Learning Studio v2: normalized curricula, agent access, and safe legacy coexistence.

CREATE TYPE public.learning_path_status AS ENUM ('draft', 'active', 'paused', 'completed', 'archived');
CREATE TYPE public.learning_item_kind AS ENUM ('lesson', 'reading', 'exercise', 'project', 'review');
CREATE TYPE public.learning_item_state AS ENUM ('not_started', 'in_progress', 'completed', 'skipped');

CREATE TABLE public.learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  legacy_learning_id UUID UNIQUE REFERENCES public.learnings(id) ON DELETE SET NULL,
  external_source_id TEXT,
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  slug TEXT NOT NULL,
  summary TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  desired_outcome TEXT,
  status public.learning_path_status NOT NULL DEFAULT 'draft',
  target_date DATE,
  weekly_minutes_target INTEGER CHECK (weekly_minutes_target IS NULL OR weekly_minutes_target > 0),
  created_by TEXT NOT NULL DEFAULT 'user' CHECK (created_by IN ('user', 'agent', 'migration')),
  source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, slug),
  UNIQUE(user_id, external_source_id)
);

CREATE TABLE public.learning_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  external_id TEXT,
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  purpose TEXT,
  position INTEGER NOT NULL CHECK (position >= 0),
  estimated_minutes INTEGER CHECK (estimated_minutes IS NULL OR estimated_minutes >= 0),
  success_criteria TEXT,
  prerequisites TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(path_id, position),
  UNIQUE(path_id, external_id)
);

CREATE TABLE public.learning_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.learning_modules(id) ON DELETE CASCADE,
  external_id TEXT,
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  instructions TEXT,
  kind public.learning_item_kind NOT NULL DEFAULT 'lesson',
  state public.learning_item_state NOT NULL DEFAULT 'not_started',
  position INTEGER NOT NULL CHECK (position >= 0),
  priority SMALLINT NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  estimated_minutes INTEGER CHECK (estimated_minutes IS NULL OR estimated_minutes >= 0),
  due_date DATE,
  evidence_required BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(module_id, position),
  UNIQUE(module_id, external_id),
  CHECK ((state = 'completed') = (completed_at IS NOT NULL))
);

CREATE TABLE public.learning_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.learning_modules(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.learning_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  resource_type TEXT NOT NULL DEFAULT 'link',
  url TEXT,
  author TEXT,
  consumed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (url IS NULL OR url ~* '^https?://')
);

CREATE TABLE public.learning_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.learning_items(id) ON DELETE CASCADE,
  author_kind TEXT NOT NULL DEFAULT 'user' CHECK (author_kind IN ('user', 'agent')),
  kind TEXT NOT NULL DEFAULT 'note' CHECK (kind IN ('note', 'link', 'submission', 'reflection')),
  title TEXT,
  body TEXT,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (body IS NOT NULL OR url IS NOT NULL)
);

CREATE TABLE public.learning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.learning_items(id) ON DELETE SET NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
  note TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_kind TEXT NOT NULL DEFAULT 'user' CHECK (actor_kind IN ('user', 'agent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.personal_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['learning:read']::TEXT[],
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (cardinality(scopes) > 0),
  CHECK (key_prefix ~ '^los_[A-Za-z0-9]{8}$')
);

CREATE TABLE public.api_request_deduplication (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.personal_api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '24 hours',
  UNIQUE(api_key_id, endpoint, idempotency_key)
);

CREATE INDEX learning_paths_user_status_idx ON public.learning_paths(user_id, status, updated_at DESC);
CREATE INDEX learning_modules_path_position_idx ON public.learning_modules(path_id, position);
CREATE INDEX learning_items_module_state_position_idx ON public.learning_items(module_id, state, position);
CREATE INDEX learning_sessions_path_occurred_idx ON public.learning_sessions(path_id, occurred_at DESC);
CREATE INDEX personal_api_keys_prefix_idx ON public.personal_api_keys(key_prefix) WHERE revoked_at IS NULL;

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER learning_paths_touch BEFORE UPDATE ON public.learning_paths FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER learning_modules_touch BEFORE UPDATE ON public.learning_modules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER learning_items_touch BEFORE UPDATE ON public.learning_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_request_deduplication ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own learning paths" ON public.learning_paths FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own learning modules" ON public.learning_modules FOR ALL USING (EXISTS (SELECT 1 FROM public.learning_paths p WHERE p.id = path_id AND p.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.learning_paths p WHERE p.id = path_id AND p.user_id = auth.uid()));
CREATE POLICY "Users manage own learning items" ON public.learning_items FOR ALL USING (EXISTS (SELECT 1 FROM public.learning_modules m JOIN public.learning_paths p ON p.id = m.path_id WHERE m.id = module_id AND p.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.learning_modules m JOIN public.learning_paths p ON p.id = m.path_id WHERE m.id = module_id AND p.user_id = auth.uid()));
CREATE POLICY "Users manage own learning resources" ON public.learning_resources FOR ALL USING (EXISTS (SELECT 1 FROM public.learning_paths p WHERE p.id = path_id AND p.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.learning_paths p WHERE p.id = path_id AND p.user_id = auth.uid()));
CREATE POLICY "Users manage own learning evidence" ON public.learning_evidence FOR ALL USING (EXISTS (SELECT 1 FROM public.learning_paths p WHERE p.id = path_id AND p.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.learning_paths p WHERE p.id = path_id AND p.user_id = auth.uid()));
CREATE POLICY "Users manage own learning sessions" ON public.learning_sessions FOR ALL USING (EXISTS (SELECT 1 FROM public.learning_paths p WHERE p.id = path_id AND p.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.learning_paths p WHERE p.id = path_id AND p.user_id = auth.uid()));
CREATE POLICY "Users manage own api keys" ON public.personal_api_keys FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own request records" ON public.api_request_deduplication FOR ALL USING (EXISTS (SELECT 1 FROM public.personal_api_keys k WHERE k.id = api_key_id AND k.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.personal_api_keys k WHERE k.id = api_key_id AND k.user_id = auth.uid()));

-- Preserve legacy records and create a minimal, repeatable normalized representation.
INSERT INTO public.learning_paths (user_id, legacy_learning_id, title, slug, summary, category, desired_outcome, status, created_by)
SELECT l.user_id, l.id, l.title, lower(regexp_replace(l.title, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || left(l.id::text, 8), l.description, l.category,
       l.content->>'target_goal', CASE l.status WHEN 'completed' THEN 'completed'::public.learning_path_status WHEN 'planned' THEN 'draft'::public.learning_path_status ELSE 'active'::public.learning_path_status END, 'migration'
FROM public.learnings l
ON CONFLICT (legacy_learning_id) DO NOTHING;
