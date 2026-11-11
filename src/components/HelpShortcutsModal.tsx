import React from 'react';
import { Keyboard, X, Sparkles } from 'lucide-react';

interface HelpShortcutsModalProps {
  onClose: () => void;
}

export const HelpShortcutsModal: React.FC<HelpShortcutsModalProps> = ({ onClose }) => {
  const shortcuts = [
    { key: '1, 2, 3, 4', desc: '+1 point au Joueur 1, 2, 3 ou 4 directement', badge: 'Score rapide' },
    { key: 'Maj + 1..4', desc: '-1 point (correction en cas d\'erreur)', badge: 'Correction' },
    { key: 'Espace', desc: 'Démarrer / Mettre en pause le Chronomètre', badge: 'Chrono' },
    { key: 'B', desc: 'Déclencher le son Buzzer (Mauvaise réponse)', badge: 'Audio' },
    { key: 'V ou G', desc: 'Déclencher la pluie de Confettis & Fanfare de Victoire', badge: 'Spectacle' },
    { key: 'R', desc: 'Nouvelle Manche (Remet les scores à 0 en gardant les noms)', badge: 'Partie' },
    { key: 'F', desc: 'Basculer en Plein Écran', badge: 'Affichage' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-scale-up">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
              <Keyboard size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Raccourcis Clavier Animateur</h3>
              <p className="text-xs text-slate-400">Pilotez le quiz d'une seule main avec le micro dans l'autre !</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-5 space-y-3">
          {shortcuts.map((sc, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60"
            >
              <div className="flex items-center gap-3">
                <kbd className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-700 text-purple-400 font-mono font-bold text-sm shadow">
                  {sc.key}
                </kbd>
                <span className="text-sm text-slate-200">{sc.desc}</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-md bg-purple-950 text-purple-300 border border-purple-800 whitespace-nowrap hidden sm:inline">
                {sc.badge}
              </span>
            </div>
          ))}

          <div className="bg-purple-950/40 border border-purple-800/50 rounded-2xl p-4 mt-4 flex items-start gap-3">
            <Sparkles size={20} className="text-purple-400 shrink-0 mt-0.5" />
            <p className="text-xs text-purple-200 leading-relaxed">
              <strong>Conseil prestation :</strong> Branchez un écran externe ou une TV en mode Bureau Étendu (HDMI). Glissez la fenêtre « Écran Public » dessus et appuyez sur Plein Écran (F11). Vous gardez la console de régie sur l'écran de votre PC.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow transition-colors"
          >
            J'ai compris !
          </button>
        </div>
      </div>
    </div>
  );
};
