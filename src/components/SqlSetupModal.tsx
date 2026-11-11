import React, { useState } from 'react';
import { Database, Check, Copy, X, ExternalLink, ShieldCheck } from 'lucide-react';
import { SESSIONS_TABLE, HISTORY_TABLE } from '../services/supabase';

interface SqlSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCloudConnected: boolean;
}

export const SqlSetupModal: React.FC<SqlSetupModalProps> = ({
  isOpen,
  onClose,
  isCloudConnected,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sqlScript = `-- ==============================================================================
-- Tables avec suffixes pour QuizMaster Pro
-- Suffixe: _quiz (Tables: ${SESSIONS_TABLE}, ${HISTORY_TABLE})
-- ==============================================================================

-- 1. Table de synchronisation des sessions en direct
CREATE TABLE IF NOT EXISTS public.${SESSIONS_TABLE} (
    id TEXT PRIMARY KEY DEFAULT 'default',
    state JSONB NOT NULL,
    last_action JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index pour requêtes rapides
CREATE INDEX IF NOT EXISTS idx_${SESSIONS_TABLE}_updated_at ON public.${SESSIONS_TABLE}(updated_at);

-- Activer Row Level Security (RLS)
ALTER TABLE public.${SESSIONS_TABLE} ENABLE ROW LEVEL SECURITY;

-- Politique d'accès public (lecture & écriture)
DROP POLICY IF EXISTS "Public access for ${SESSIONS_TABLE}" ON public.${SESSIONS_TABLE};
CREATE POLICY "Public access for ${SESSIONS_TABLE}" 
ON public.${SESSIONS_TABLE} 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 2. Table d'historique des vainqueurs
CREATE TABLE IF NOT EXISTS public.${HISTORY_TABLE} (
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

-- Index sur date
CREATE INDEX IF NOT EXISTS idx_${HISTORY_TABLE}_created_at ON public.${HISTORY_TABLE}(created_at DESC);

-- Activer RLS pour l'historique
ALTER TABLE public.${HISTORY_TABLE} ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access for ${HISTORY_TABLE}" ON public.${HISTORY_TABLE};
CREATE POLICY "Public access for ${HISTORY_TABLE}" 
ON public.${HISTORY_TABLE} 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 3. Activer la réplication Supabase Realtime (WebSockets)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = '${SESSIONS_TABLE}'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.${SESSIONS_TABLE};
    END IF;
END $$;
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-scale-up">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isCloudConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}`}>
              <Database size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">Connexion Base de Données Supabase</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isCloudConnected
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : 'bg-amber-950 text-amber-300 border border-amber-700'
                }`}>
                  {isCloudConnected ? 'Tables Actives ✓' : 'Action Requise'}
                </span>
              </div>
              <p className="text-xs text-slate-400">Projet : <code className="text-purple-300">ncaahysqlobecigoaqna</code></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-white">
              <ShieldCheck size={18} className="text-emerald-400" />
              Isolation & Confinement des données
            </div>
            <p>
              Toutes les tables créées pour cette application utilisent obligatoirement le suffixe <strong className="text-purple-400">`_quiz`</strong> (<code className="text-white bg-slate-900 px-1 py-0.5 rounded">{SESSIONS_TABLE}</code> et <code className="text-white bg-slate-900 px-1 py-0.5 rounded">{HISTORY_TABLE}</code>). Elles n'entrent jamais en conflit avec les autres projets partageant cette base de données.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Script SQL de création des tables :
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all"
              >
                {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                {copied ? 'Copié dans le presse-papier !' : 'Copier le script SQL'}
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-purple-200 overflow-x-auto max-h-56 leading-relaxed select-all">
              {sqlScript}
            </pre>
          </div>

          <div className="bg-purple-950/30 border border-purple-800/40 rounded-2xl p-4 text-xs text-purple-200 space-y-2">
            <p className="font-semibold text-white">Comment exécuter ce script en 10 secondes :</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-300">
              <li>Ouvrez votre dashboard Supabase sur le projet <strong className="text-white">ncaahysqlobecigoaqna</strong>.</li>
              <li>Allez dans le menu <strong className="text-purple-300">SQL Editor</strong>.</li>
              <li>Collez ce script et cliquez sur <strong className="text-emerald-400">Run</strong>.</li>
            </ol>
            <a
              href="https://supabase.com/dashboard/project/ncaahysqlobecigoaqna/sql/new"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 font-bold underline mt-1"
            >
              <span>Accéder directement au SQL Editor de votre projet</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {isCloudConnected ? '🟢 Synchronisation multi-appareils opérationnelle' : '🟡 En attente de création des tables'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
