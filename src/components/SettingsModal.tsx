import React from 'react';
import { QuizState, ThemeKey } from '../types';
import { THEMES } from '../constants/themes';
import { Settings, X, Palette, Volume2, Users, Target, Type, RotateCcw } from 'lucide-react';
import { INITIAL_QUIZ_STATE } from '../constants/defaultData';

interface SettingsModalProps {
  state: QuizState;
  onUpdateState: (partial: Partial<QuizState>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  state,
  onUpdateState,
  onClose,
}) => {
  const handlePlayerCountChange = (count: number) => {
    let newPlayers = [...state.players];
    if (count > newPlayers.length) {
      // Add players
      for (let i = newPlayers.length; i < count; i++) {
        newPlayers.push({
          id: `p${Date.now()}-${i}`,
          name: `Joueur ${i + 1}`,
          score: 0,
          status: 'active',
          colorIndex: i,
        });
      }
    } else if (count < newPlayers.length) {
      // Trim players
      newPlayers = newPlayers.slice(0, count);
    }
    onUpdateState({ players: newPlayers });
  };

  const handleResetDefaults = () => {
    if (confirm('Voulez-vous réinitialiser tous les paramètres aux valeurs d\'origine ?')) {
      onUpdateState(INITIAL_QUIZ_STATE);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-scale-up">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
              <Settings size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Paramètres du Quiz & Personnalisation</h3>
              <p className="text-xs text-slate-400">Adaptez les textes, les règles et les couleurs à votre événement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SECTION 1: TEXTS & TITLES */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
              <Type size={16} /> Textes Affichés sur Grand Écran
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Titre principal de l'animation / événement
              </label>
              <input
                type="text"
                value={state.eventTitle}
                onChange={(e) => onUpdateState({ eventTitle: e.target.value })}
                placeholder="Ex: La galerie fête le Printemps du 6 au 16 mars"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Sous-titre / Thème (optionnel)
                </label>
                <input
                  type="text"
                  value={state.eventSubtitle || ''}
                  onChange={(e) => onUpdateState({ eventSubtitle: e.target.value })}
                  placeholder="Ex: Session 10h30 - Culture Générale"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Message inférieur (Heure ou Ticker)
                </label>
                <input
                  type="text"
                  value={state.nextSessionText}
                  onChange={(e) => onUpdateState({ nextSessionText: e.target.value })}
                  placeholder="Ex: Prochain Quiz à 10h30"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: GAMEPLAY RULES */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
              <Target size={16} /> Règles du Jeu
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Number of players */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Users size={14} /> Nombre de candidats simultanés
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[2, 3, 4, 5, 6].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => handlePlayerCountChange(count)}
                      className={`py-2 rounded-xl text-xs font-extrabold transition-all ${
                        state.players.length === count
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Winning score */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Score de Victoire automatique
                </label>
                <div className="flex items-center gap-3">
                  <select
                    value={state.winScore}
                    onChange={(e) => onUpdateState({ winScore: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-semibold"
                  >
                    <option value={2}>2 points</option>
                    <option value={3}>3 points (comme dans l'Excel d'origine)</option>
                    <option value={4}>4 points</option>
                    <option value={5}>5 points</option>
                    <option value={10}>10 points</option>
                    <option value={0}>Aucun (victoire manuelle uniquement)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: THEMES & GRAPHIC AMBIANCE */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
              <Palette size={16} /> Thème Graphique du Grand Écran
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(Object.keys(THEMES) as ThemeKey[]).map((themeKey) => {
                const t = THEMES[themeKey];
                const isSelected = state.theme === themeKey;

                return (
                  <button
                    key={themeKey}
                    type="button"
                    onClick={() => onUpdateState({ theme: themeKey })}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'border-purple-500 ring-2 ring-purple-500/40 bg-slate-800'
                        : 'border-slate-700/80 bg-slate-800/40 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-5 h-5 rounded-full border border-white/30 shadow-inner"
                        style={{ backgroundColor: t.bgColor }}
                      />
                      <span className="font-bold text-xs text-white truncate">{t.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-tight">
                      {t.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 4: SOUND FX */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-800 text-purple-400">
                <Volume2 size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Effets Sonores (Buzzer, Ding, Fanfare)</h4>
                <p className="text-xs text-slate-400">Sons synthétisés haute qualité pour dynamiser le stand</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onUpdateState({ soundEnabled: !state.soundEnabled })}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                state.soundEnabled
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {state.soundEnabled ? 'Activés ✓' : 'Muet'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw size={14} /> Restaurer la configuration par défaut
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg transition-colors"
          >
            Enregistrer & Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
