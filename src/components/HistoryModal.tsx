import React from 'react';
import { WinnerHistoryItem } from '../types';
import { Trophy, Download, Trash2, X, Clock, Award } from 'lucide-react';

interface HistoryModalProps {
  history: WinnerHistoryItem[];
  onClearHistory: () => void;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  history,
  onClearHistory,
  onClose,
}) => {
  const handleExportCSV = () => {
    if (history.length === 0) return;
    const headers = ['Date', 'Heure', 'Manche', 'Gagnant', 'Score Gagnant', 'Détail Scores'];
    const rows = history.map((item) => [
      item.timestamp.split('T')[0],
      item.formattedTime,
      `Manche ${item.round}`,
      `"${item.winnerName.replace(/"/g, '""')}"`,
      item.winningScore,
      `"${item.playersSummary.map((p) => `${p.name}: ${p.score}`).join(' | ')}"`,
    ]);

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `palmares_quiz_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-scale-up">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
              <Trophy size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Palmarès & Gagnants du Jour</h3>
              <p className="text-xs text-slate-400">Historique des manches remportées lors de la prestation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Award size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Aucun gagnant enregistré pour le moment.</p>
              <p className="text-xs mt-1">Dès qu'un joueur atteint le score cible ou est déclaré vainqueur, il apparaîtra ici.</p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3.5">
                  <span className="text-2xl mt-0.5">🏆</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-base text-amber-300">{item.winnerName}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold">
                        {item.winningScore} pts
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {item.formattedTime}
                      </span>
                      <span>Manche #{item.round}</span>
                    </div>
                    {/* Other scores */}
                    <div className="text-xs text-slate-400 mt-2 flex flex-wrap gap-2">
                      {item.playersSummary.map((p, idx) => (
                        <span key={idx} className="bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700/50">
                          {p.name} : {p.score}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClearHistory}
            disabled={history.length === 0}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1.5"
          >
            <Trash2 size={15} />
            Effacer l'historique
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={history.length === 0}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1.5"
            >
              <Download size={15} />
              Exporter (CSV)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
