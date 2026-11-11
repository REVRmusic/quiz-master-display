-- ==============================================================================
-- Tables avec suffixes pour QuizMaster Pro (Projet: ncaahysqlobecigoaqna)
-- Suffixe: _quiz
-- ==============================================================================

-- 1. Table de synchronisation en direct des sessions de quiz
CREATE TABLE IF NOT EXISTS public.sessions_quiz (
    id TEXT PRIMARY KEY DEFAULT 'default',
    state JSONB NOT NULL,
    last_action JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_sessions_quiz_updated_at ON public.sessions_quiz(updated_at);

-- Activer Row Level Security (RLS)
ALTER TABLE public.sessions_quiz ENABLE ROW LEVEL SECURITY;

-- Politique d'accès public (lecture & écriture pour l'application avec la clé publishable)
DROP POLICY IF EXISTS "Public access for sessions_quiz" ON public.sessions_quiz;
CREATE POLICY "Public access for sessions_quiz" 
ON public.sessions_quiz 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 2. Table d'historique des vainqueurs et des manches
CREATE TABLE IF NOT EXISTS public.history_quiz (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    formatted_time TEXT NOT NULL,
    round INTEGER NOT NULL DEFAULT 1,
    winner_name TEXT NOT NULL,
    winning_score INTEGER NOT NULL DEFAULT 0,
    event_title TEXT NOT NULL,
    players_summary JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index sur date de création
CREATE INDEX IF NOT EXISTS idx_history_quiz_created_at ON public.history_quiz(created_at DESC);

-- Activer RLS pour l'historique
ALTER TABLE public.history_quiz ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access for history_quiz" ON public.history_quiz;
CREATE POLICY "Public access for history_quiz" 
ON public.history_quiz 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 3. Activer la réplication Supabase Realtime (WebSockets) sur la table sessions_quiz
-- Note: Si la table est déjà dans la publication, l'instruction est sans effet de bord
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'sessions_quiz'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions_quiz;
    END IF;
END $$;
