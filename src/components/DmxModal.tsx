import React from 'react';
import { DmxConfig, QuizState, SyncAction } from '../types';
import { DmxPanel } from './DmxPanel';
import { Lightbulb, X } from 'lucide-react';

interface DmxModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: QuizState;
  isCloudConnected: boolean;
  onUpdateDmxConfig: (cfg: DmxConfig) => void;
  onSendAction: (action: SyncAction) => void;
}

export const DmxModal: React.FC<DmxModalProps> = ({
  isOpen,
  onClose,
  state,
  isCloudConnected,
  onUpdateDmxConfig,
  onSendAction,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-scale-up">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
              <Lightbulb size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Éclairages DMX & Pont Sunlite (Windows)</h3>
              <p className="text-xs text-slate-400">
                Pilotage automatique des PAR LEDs par touches clavier en temps réel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <DmxPanel
            state={state}
            isCloudConnected={isCloudConnected}
            onUpdateDmxConfig={onUpdateDmxConfig}
            onSendAction={onSendAction}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow transition-colors"
          >
            Fermer & Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};
