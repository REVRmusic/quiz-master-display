import React, { useEffect, useState } from 'react';
import { DmxConfig, QuizState, SyncAction } from '../types';
import { syncService } from '../services/sync';
import { supabaseService } from '../services/supabase';
import { DmxPanel } from './DmxPanel';
import { Lightbulb, ArrowLeft } from 'lucide-react';

export const DmxStandaloneView: React.FC = () => {
  const [state, setState] = useState<QuizState>(() => syncService.loadState());
  const [isCloudConnected, setIsCloudConnected] = useState(false);

  useEffect(() => {
    const unsubState = syncService.onState((newState) => {
      setState(newState);
    });
    const unsubCloud = supabaseService.onConnectionChange((connected) => {
      setIsCloudConnected(connected);
    });

    return () => {
      unsubState();
      unsubCloud();
    };
  }, []);

  const handleUpdateDmxConfig = (dmxConfig: DmxConfig) => {
    setState((prev) => {
      const next = { ...prev, dmxConfig, lastUpdated: Date.now() };
      syncService.saveState(next);
      return next;
    });
  };

  const handleSendAction = (action: SyncAction) => {
    syncService.sendAction(action);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 sticky top-0 z-40 shadow-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center shadow-lg text-white">
              <Lightbulb size={20} />
            </div>
            <div>
              <h1 className="font-extrabold text-base sm:text-lg text-white">
                QuizMaster Pro — Moniteur Lumières DMX (Sunlite)
              </h1>
              <p className="text-xs text-slate-400">
                Vue dédiée au PC Lumières • {state.eventTitle}
              </p>
            </div>
          </div>

          <a
            href="?"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-2 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Régie Animateur</span>
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        <DmxPanel
          state={state}
          isCloudConnected={isCloudConnected}
          onUpdateDmxConfig={handleUpdateDmxConfig}
          onSendAction={handleSendAction}
          isStandalonePage={true}
        />
      </main>
    </div>
  );
};
