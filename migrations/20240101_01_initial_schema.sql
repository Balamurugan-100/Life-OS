-- ============================================================
-- Life OS Application Database Schema
-- Compatible with PostgreSQL 14+ / Supabase
-- ============================================================

-- In Supabase (PostgreSQL 14+), gen_random_uuid() is built-in and natively available in the public/pg_catalog schema.
-- We also enable "pgcrypto" if needed.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. Table: profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile') THEN
    CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile') THEN
    CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- Trigger to create profile when auth.users is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. Table: learnings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('planned', 'in_progress', 'completed')),
  content JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learnings_user_id ON public.learnings(user_id);
CREATE INDEX IF NOT EXISTS idx_learnings_category ON public.learnings(user_id, category);
CREATE INDEX IF NOT EXISTS idx_learnings_created_at ON public.learnings(created_at DESC);

ALTER TABLE public.learnings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'learnings' AND policyname = 'Users can view own learnings') THEN
    CREATE POLICY "Users can view own learnings" ON public.learnings FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'learnings' AND policyname = 'Users can insert own learnings') THEN
    CREATE POLICY "Users can insert own learnings" ON public.learnings FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'learnings' AND policyname = 'Users can update own learnings') THEN
    CREATE POLICY "Users can update own learnings" ON public.learnings FOR UPDATE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'learnings' AND policyname = 'Users can delete own learnings') THEN
    CREATE POLICY "Users can delete own learnings" ON public.learnings FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- 3. Table: finances
-- ============================================================
CREATE TABLE IF NOT EXISTS public.finances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finances_user_type ON public.finances(user_id, type);
CREATE INDEX IF NOT EXISTS idx_finances_category ON public.finances(user_id, category);
CREATE INDEX IF NOT EXISTS idx_finances_date ON public.finances(date DESC);

ALTER TABLE public.finances ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finances' AND policyname = 'Users can view own finances') THEN
    CREATE POLICY "Users can view own finances" ON public.finances FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finances' AND policyname = 'Users can insert own finances') THEN
    CREATE POLICY "Users can insert own finances" ON public.finances FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finances' AND policyname = 'Users can update own finances') THEN
    CREATE POLICY "Users can update own finances" ON public.finances FOR UPDATE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finances' AND policyname = 'Users can delete own finances') THEN
    CREATE POLICY "Users can delete own finances" ON public.finances FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- 4. Table: diet
-- ============================================================
CREATE TABLE IF NOT EXISTS public.diet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL DEFAULT 'meal' CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name TEXT NOT NULL,
  calories INTEGER NOT NULL DEFAULT 0,
  protein DECIMAL(6, 2) DEFAULT 0,
  carbs DECIMAL(6, 2) DEFAULT 0,
  fat DECIMAL(6, 2) DEFAULT 0,
  notes TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diet_user_date ON public.diet(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_diet_meal_type ON public.diet(user_id, meal_type);

ALTER TABLE public.diet ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diet' AND policyname = 'Users can view own diet') THEN
    CREATE POLICY "Users can view own diet" ON public.diet FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diet' AND policyname = 'Users can insert own diet') THEN
    CREATE POLICY "Users can insert own diet" ON public.diet FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diet' AND policyname = 'Users can update own diet') THEN
    CREATE POLICY "Users can update own diet" ON public.diet FOR UPDATE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'diet' AND policyname = 'Users can delete own diet') THEN
    CREATE POLICY "Users can delete own diet" ON public.diet FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- 5. Views
-- ============================================================
CREATE OR REPLACE VIEW public.user_learnings_summary AS
SELECT 
  user_id,
  COUNT(*) as total_learnings,
  MIN(created_at) as first_learning,
  MAX(created_at) as last_learning
FROM public.learnings
GROUP BY user_id;

CREATE OR REPLACE VIEW public.user_finances_summary AS
SELECT 
  user_id,
  COUNT(*) as total_transactions,
  COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
  COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
  COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as net_balance
FROM public.finances
GROUP BY user_id;

CREATE OR REPLACE VIEW public.user_diet_summary AS
SELECT 
  user_id,
  COUNT(*) as total_meals,
  COALESCE(AVG(calories), 0) as avg_calories,
  COALESCE(SUM(calories), 0) as total_calories,
  COALESCE(SUM(protein), 0) as total_protein,
  COALESCE(SUM(carbs), 0) as total_carbs,
  COALESCE(SUM(fat), 0) as total_fat
FROM public.diet
GROUP BY user_id;