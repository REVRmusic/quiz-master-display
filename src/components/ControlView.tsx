import React, { useState, useEffect } from 'react';
import { QuizState, Player, WinnerHistoryItem, SyncAction } from '../types';
import { syncService } from '../services/sync';
import { soundEffects } from '../services/audio';
import { supabaseService } from '../services/supabase';
import { SponsorManager } from './SponsorManager';
import { SettingsModal } from './SettingsModal';
import { TimerWidget } from './TimerWidget';
import { HistoryModal } from './HistoryModal';
import { HelpShortcutsModal } from './HelpShortcutsModal';
import { SqlSetupModal } from './SqlSetupModal';
import { DmxModal } from './DmxModal';
import { getPlayerDmxColor, getDmxColorMeta } from '../utils/dmx';
import { 
  Trophy, 
  ExternalLink, 
  RotateCcw, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Settings, 
  Keyboard, 
  Building2, 
  History, 
  Radio, 
  UserX, 
  Coffee, 
  PlaySquare, 
  Volume1,
  Database,
  Users,
  Lightbulb
} from 'lucide-react';

interface ControlViewProps {
  initialState?: QuizState;
}

export const ControlView: React.FC<ControlViewProps> = ({ initialState }) => {
  const [state, setState] = useState<QuizState>(() => initialState || syncService.loadState());
  const [isDisplayConnected, setIsDisplayConnected] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [history, setHistory] = useState<WinnerHistoryItem[]>(() => syncService.loadHistory());

  // Modals state
  const [showSponsors, setShowSponsors] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [showDmxModal, setShowDmxModal] = useState(false);

  // Monitor Display & Supabase connection
  useEffect(() => {
    syncService.startHeartbeat();
    const unsubConn = syncService.onDisplayConnectionChange((connected) => {
      setIsDisplayConnected(connected);
    });

    const unsubCloud = supabaseService.onConnectionChange((connected) => {
      setIsCloudConnected(connected);
    });

    const unsubState = syncService.onState((newState) => {
      setState(newState);
    });

    const unsubHistory = syncService.onHistory((newHistory) => {
      setHistory(newHistory);
    });

    const unsubAction = syncService.onAction((action: SyncAction) => {
      if (action.type === 'PONG') {
        setIsDisplayConnected(true);
      }
    });

    return () => {
      syncService.stopHeartbeat();
      unsubConn();
      unsubCloud();
      unsubState();
      unsubHistory();
      unsubAction();
    };
  }, []);

  // Update sound state
  useEffect(() => {
    soundEffects.setEnabled(state.soundEnabled);
  }, [state.soundEnabled]);

  // Save & broadcast helper
  const updateStateAndBroadcast = (partial: Partial<QuizState>, action?: SyncAction) => {
    setState((prev) => {
      const next = { ...prev, ...partial, lastUpdated: Date.now() };
      syncService.saveState(next, action);
      return next;
    });
  };

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Keys 1 to 6: Player score
      const keyNum = parseInt(e.key, 10);
      if (keyNum >= 1 && keyNum <= state.players.length) {
        e.preventDefault();
        const playerIndex = keyNum - 1;
        if (e.shiftKey || e.altKey) {
          adjustPlayerScore(state.players[playerIndex].id, -1);
        } else {
          adjustPlayerScore(state.players[playerIndex].id, 1);
        }
        return;
      }

      // Space: Toggle timer
      if (e.code === 'Space') {
        e.preventDefault();
        const nextRunning = !state.timerRunning;
        updateStateAndBroadcast({
          timerEnabled: true,
          timerRunning: nextRunning,
        });
        return;
      }

      // B: Buzzer
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        playBuzzerSound();
        return;
      }

      // V or G: Confetti victory
      if (e.key === 'v' || e.key === 'V' || e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        triggerVictoryConfetti();
        return;
      }

      // R: New round
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleNewRound();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state]);

  // Adjust score
  const adjustPlayerScore = (playerId: string, delta: number) => {
    let triggeredWin = false;
    let winningPlayerName = '';
    let winningPlayerScore = 0;

    const newPlayers = state.players.map((p) => {
      if (p.id !== playerId) return p;
      const nextScore = Math.max(0, p.score + delta);
      const isWinner = state.winScore > 0 && nextScore >= state.winScore;

      if (isWinner && p.status !== 'winner') {
        triggeredWin = true;
        winningPlayerName = p.name;
        winningPlayerScore = nextScore;
      }

      return {
        ...p,
        score: nextScore,
        status: isWinner ? ('winner' as const) : p.status === 'winner' && !isWinner ? ('active' as const) : p.status,
      };
    });

    let actionToSend: SyncAction | undefined;
    if (delta > 0) {
      if (triggeredWin) {
        soundEffects.playWin();
        actionToSend = { type: 'TRIGGER_CONFETTI', payload: { intensity: 'massive' } };
        syncService.sendAction(actionToSend);
        recordWinner(winningPlayerName, winningPlayerScore, newPlayers);
      } else {
        soundEffects.playCorrect();
        actionToSend = { type: 'PLAY_SOUND', payload: { sound: 'correct' } };
        syncService.sendAction(actionToSend);
      }
    } else if (delta < 0) {
      soundEffects.playWrong();
      actionToSend = { type: 'PLAY_SOUND', payload: { sound: 'wrong' } };
      syncService.sendAction(actionToSend);
    }

    updateStateAndBroadcast(
      {
        players: newPlayers,
        winnerPlayerId: triggeredWin ? playerId : state.winnerPlayerId,
      },
      actionToSend
    );
  };

  // INDIVIDUAL PLAYER RESET TO 0 (Requested by Organizer: replaces +2 button)
  const resetPlayerScore = (playerId: string) => {
    const newPlayers = state.players.map((p) => {
      if (p.id !== playerId) return p;
      return {
        ...p,
        score: 0,
        status: p.status === 'winner' ? ('active' as const) : p.status,
      };
    });
    updateStateAndBroadcast({ players: newPlayers });
  };

  // RESET ACTIVE PLAYERS ONLY (Keep existing winners in green and eliminated in red)
  const resetQualifiedPlayers = () => {
    const newPlayers = state.players.map((p) => {
      if (p.status === 'eliminated' || p.status === 'winner') return p;
      return {
        ...p,
        score: 0,
        status: 'active' as const,
      };
    });
    updateStateAndBroadcast({
      players: newPlayers,
      currentRound: state.currentRound + 1,
      winnerPlayerId: null,
    });
  };

  // Toggle player elimination (Excel row 7 "X" = "Perdu")
  const togglePlayerElimination = (playerId: string) => {
    const newPlayers = state.players.map((p) => {
      if (p.id !== playerId) return p;
      const nextStatus = p.status === 'eliminated' ? ('active' as const) : ('eliminated' as const);
      if (nextStatus === 'eliminated') {
        soundEffects.playWrong();
        syncService.sendAction({ type: 'PLAY_SOUND', payload: { sound: 'wrong' } });
      }
      return { ...p, status: nextStatus };
    });
    updateStateAndBroadcast({ players: newPlayers });
  };

  // Declare winner manually
  const declareWinnerManually = (playerId: string) => {
    const targetPlayer = state.players.find((p) => p.id === playerId);
    if (!targetPlayer) return;

    const newPlayers = state.players.map((p) =>
      p.id === playerId ? { ...p, status: 'winner' as const } : p
    );

    soundEffects.playWin();
    const action: SyncAction = { type: 'TRIGGER_CONFETTI', payload: { intensity: 'massive' } };
    syncService.sendAction(action);

    recordWinner(targetPlayer.name, targetPlayer.score, newPlayers);

    updateStateAndBroadcast(
      {
        players: newPlayers,
        winnerPlayerId: playerId,
      },
      action
    );
  };

  // Record winner to history
  const recordWinner = (name: string, score: number, players: Player[]) => {
    const now = new Date();
    const newRecord: WinnerHistoryItem = {
      id: `win-${Date.now()}`,
      timestamp: now.toISOString(),
      formattedTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      round: state.currentRound,
      winnerName: name,
      winningScore: score,
      eventTitle: state.eventTitle,
      playersSummary: players.map((p) => ({ name: p.name, score: p.score })),
    };

    const nextHistory = [newRecord, ...history];
    setHistory(nextHistory);
    syncService.saveHistory(nextHistory);
  };

  // Reset / New Round completely
  const handleNewRound = () => {
    const resetPlayers = state.players.map((p) => ({
      ...p,
      score: 0,
      status: 'active' as const,
    }));

    updateStateAndBroadcast({
      players: resetPlayers,
      currentRound: state.currentRound + 1,
      winnerPlayerId: null,
      timerRunning: false,
      timerRemaining: state.timerDuration,
      displayMode: 'scoreboard',
    });
  };

  // Reset all scores to 0
  const handleResetScores = () => {
    if (confirm('Remettre tous les scores à 0 ?')) {
      const resetPlayers = state.players.map((p) => ({
        ...p,
        score: 0,
        status: p.status === 'winner' ? ('active' as const) : p.status,
      }));
      updateStateAndBroadcast({
        players: resetPlayers,
        winnerPlayerId: null,
      });
    }
  };

  // Rename player
  const handleRenamePlayer = (playerId: string, newName: string) => {
    const newPlayers = state.players.map((p) =>
      p.id === playerId ? { ...p, name: newName } : p
    );
    updateStateAndBroadcast({ players: newPlayers });
  };

  // Trigger manual effects
  const triggerVictoryConfetti = () => {
    soundEffects.playWin();
    const action: SyncAction = { type: 'TRIGGER_CONFETTI', payload: { intensity: 'massive' } };
    syncService.sendAction(action);
  };

  const playBuzzerSound = () => {
    soundEffects.playWrong();
    const action: SyncAction = { type: 'PLAY_SOUND', payload: { sound: 'wrong' } };
    syncService.sendAction(action);
  };

  // Open Display in popup or new tab for extended monitor
  const openPublicDisplayWindow = () => {
    const url = `${window.location.origin}${window.location.pathname}?view=display`;
    window.open(url, 'QuizMasterDisplay', 'width=1280,height=720,menubar=no,toolbar=no,location=no');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* TOP HEADER: Dual Screen Status & Supabase Status & Quick Actions */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3 sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20 text-white font-black text-xl">
              Q
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                  QuizMaster Pro
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-700/50 uppercase tracking-wider">
                  Régie Animateur
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Manche #{state.currentRound} • {state.players.length} Joueurs
              </p>
            </div>
          </div>

          {/* DUAL-SCREEN & SUPABASE SYNC STATUS BADGES */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Display connection */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                isDisplayConnected
                  ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-700/60 text-amber-300'
              }`}
              title={
                isDisplayConnected
                  ? 'La fenêtre d\'affichage public est ouverte et synchronisée.'
                  : 'Aucune fenêtre grand écran détectée sur cette machine.'
              }
            >
              <Radio
                size={14}
                className={isDisplayConnected ? 'animate-pulse text-emerald-400' : 'text-amber-400'}
              />
              <span>{isDisplayConnected ? 'Écran Connecté' : 'Écran non détecté'}</span>
            </div>

            {/* Supabase Cloud Connection Status */}
            <button
              type="button"
              onClick={() => setShowSqlModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                isCloudConnected
                  ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/40'
                  : 'bg-purple-950/40 border-purple-700/60 text-purple-300 hover:bg-purple-900/40'
              }`}
              title="Statut de la base de données Supabase (Cliquez pour voir le setup SQL)"
            >
              <Database size={14} className={isCloudConnected ? 'text-emerald-400' : 'text-purple-400'} />
              <span>{isCloudConnected ? 'Cloud Supabase Connecté' : 'Setup Supabase'}</span>
            </button>

            <button
              type="button"
              onClick={openPublicDisplayWindow}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 flex items-center gap-2 transition-all transform hover:scale-105"
            >
              <ExternalLink size={15} />
              <span className="hidden sm:inline">Ouvrir l'Écran Public (2e Écran)</span>
              <span className="sm:hidden">2e Écran</span>
            </button>
          </div>

          {/* RIGHT ACTION BUTTONS */}
          <div className="flex items-center gap-2">
            {/* Display Mode: Scoreboard vs Intermission */}
            <button
              type="button"
              onClick={() =>
                updateStateAndBroadcast({
                  displayMode: state.displayMode === 'scoreboard' ? 'intermission' : 'scoreboard',
                })
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                state.displayMode === 'intermission'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {state.displayMode === 'intermission' ? (
                <>
                  <PlaySquare size={14} /> Revenir aux Scores
                </>
              ) : (
                <>
                  <Coffee size={14} /> Mode Pause / Attente
                </>
              )}
            </button>

            {/* Sound toggle */}
            <button
              type="button"
              onClick={() => updateStateAndBroadcast({ soundEnabled: !state.soundEnabled })}
              className={`p-2 rounded-xl border transition-colors ${
                state.soundEnabled
                  ? 'bg-slate-800 border-slate-700 text-emerald-400'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
              title={state.soundEnabled ? 'Sons activés' : 'Sons désactivés'}
            >
              {state.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            {/* DMX / Sunlite Manager */}
            <button
              type="button"
              onClick={() => setShowDmxModal(true)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                state.dmxConfig?.enabled !== false
                  ? 'bg-amber-950/40 hover:bg-amber-900/50 border-amber-700/60 text-amber-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400'
              }`}
              title="Pilotage DMX Sunlite & Téléchargement Companion Windows"
            >
              <Lightbulb size={15} className={state.dmxConfig?.enabled !== false ? 'text-amber-400' : 'text-slate-500'} />
              <span className="hidden md:inline">DMX Sunlite</span>
            </button>

            {/* Sponsor Manager */}
            <button
              type="button"
              onClick={() => setShowSponsors(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors relative"
              title="Gérer les logos des sponsors"
            >
              <Building2 size={15} className="text-amber-400" />
              <span className="hidden md:inline">Sponsors</span>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            </button>

            {/* History */}
            <button
              type="button"
              onClick={() => setShowHistory(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
              title="Palmarès des gagnants"
            >
              <History size={18} />
            </button>

            {/* Shortcuts help */}
            <button
              type="button"
              onClick={() => setShowShortcuts(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
              title="Raccourcis clavier"
            >
              <Keyboard size={18} />
            </button>

            {/* Settings */}
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
              title="Paramètres de l'événement"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* TOP BANNER: Quick Event Overview & Stage Actions */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 block mb-0.5">
              Animation en cours
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-white truncate">
              {state.eventTitle}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Message bas : <strong className="text-yellow-300">{state.nextSessionText}</strong> • Seuil victoire : <strong className="text-purple-300">{state.winScore > 0 ? `${state.winScore} pts` : 'Manuel'}</strong>
            </p>
          </div>

          {/* FAST ACTION BUTTONS */}
          <div className="flex flex-wrap items-center gap-2">
            {/* RESET ACTIVE PLAYERS (Keep existing winners in green and eliminated in red) */}
            <button
              type="button"
              onClick={resetQualifiedPlayers}
              className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-1.5"
              title="Remet à 0 les joueurs en jeu (bleu) tout en gardant les gagnants en vert et les éliminés en rouge"
            >
              <Users size={16} />
              <span>Manche suiv. (Garder Gagnants)</span>
            </button>

            <button
              type="button"
              onClick={handleNewRound}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-2"
              title="Raccourci : Touche R (Nouvelle manche complète)"
            >
              <RotateCcw size={16} />
              <span>Nouvelle Manche</span>
            </button>

            <button
              type="button"
              onClick={triggerVictoryConfetti}
              className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg transition-all flex items-center gap-1.5"
              title="Raccourci : Touche V"
            >
              <Sparkles size={16} />
              <span>Confettis</span>
            </button>

            <button
              type="button"
              onClick={playBuzzerSound}
              className="px-3.5 py-2.5 rounded-xl bg-rose-600/30 hover:bg-rose-600 border border-rose-500/50 hover:border-rose-500 text-rose-200 hover:text-white font-bold text-xs transition-all flex items-center gap-1.5"
              title="Raccourci : Touche B"
            >
              <Volume1 size={16} />
              <span>Buzzer</span>
            </button>

            <button
              type="button"
              onClick={handleResetScores}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors"
              title="Remettre tous les scores à zéro"
            >
              Tous à 0
            </button>
          </div>
        </div>

        {/* TIMER & QUICK TOOLS ROW */}
        <TimerWidget
          enabled={state.timerEnabled}
          duration={state.timerDuration}
          remaining={state.timerRemaining}
          isRunning={state.timerRunning}
          soundEnabled={state.soundEnabled}
          onToggleTimer={(enabled) => updateStateAndBroadcast({ timerEnabled: enabled })}
          onSetDuration={(dur) => updateStateAndBroadcast({ timerDuration: dur })}
          onSetRemaining={(rem) => updateStateAndBroadcast({ timerRemaining: rem })}
          onSetRunning={(run) => updateStateAndBroadcast({ timerRunning: run })}
          onBroadcastTimer={(rem, run) =>
            updateStateAndBroadcast({ timerRemaining: rem, timerRunning: run })
          }
        />

        {/* PLAYERS CONTROLLER GRID */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Trophy size={16} className="text-purple-400" />
              Pupitres des Candidats (Touches Clavier 1 à {state.players.length})
            </h3>
            <span className="text-xs text-slate-500">
              Tapez <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-purple-300 font-mono">1</kbd>, <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-purple-300 font-mono">2</kbd>... pour +1 pt
            </span>
          </div>

          <div
            className={`grid gap-4 ${
              state.players.length === 2
                ? 'grid-cols-1 sm:grid-cols-2'
                : state.players.length === 3
                ? 'grid-cols-1 sm:grid-cols-3'
                : state.players.length === 4
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                : state.players.length === 5
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'
                : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
            }`}
          >
            {state.players.map((player, index) => {
              const isWinner =
                player.status === 'winner' ||
                (state.winScore > 0 && player.score >= state.winScore);
              const isEliminated = player.status === 'eliminated';
              const dmxColor = getPlayerDmxColor(player, state.winScore);
              const dmxMeta = getDmxColorMeta(dmxColor);

              return (
                <div
                  key={player.id}
                  className={`rounded-2xl p-4 sm:p-5 border transition-all flex flex-col justify-between shadow-xl relative overflow-hidden ${
                    isWinner
                      ? 'bg-gradient-to-b from-amber-950/70 to-slate-900 border-amber-500 ring-2 ring-amber-400/40 shadow-amber-500/20'
                      : isEliminated
                      ? 'bg-rose-950/20 border-rose-900/60 opacity-60'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top card bar: Player Index, DMX LED indicator & Status Badge */}
                  <div className="flex items-center justify-between mb-3 gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded-lg bg-slate-800 text-purple-400 font-mono font-bold text-xs flex items-center justify-center border border-slate-700">
                        {index + 1}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${dmxMeta.pillClass}`}
                        title={`Éclairage DMX PAR LED : ${dmxMeta.label}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${dmxMeta.dotClass}`} />
                        {dmxMeta.label}
                      </span>
                    </div>

                    {/* Winner badge or eliminate badge */}
                    {isWinner ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow">
                        <Trophy size={12} /> Gagnant
                      </span>
                    ) : isEliminated ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold text-[10px] uppercase tracking-wider">
                        Éliminé
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                        Touche [{index + 1}]
                      </span>
                    )}
                  </div>

                  {/* Player Name editable input */}
                  <div className="mb-4">
                    <input
                      type="text"
                      value={player.name}
                      onChange={(e) => handleRenamePlayer(player.id, e.target.value)}
                      className="w-full bg-slate-800/80 hover:bg-slate-800 focus:bg-slate-800 border border-slate-700 focus:border-purple-500 rounded-xl px-3 py-1.5 text-sm font-bold text-white text-center focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors"
                      placeholder="Nom du joueur"
                    />
                  </div>

                  {/* Giant Score */}
                  <div className="text-center my-2">
                    <span
                      className={`font-black text-6xl tracking-tight leading-none ${
                        isWinner
                          ? 'text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]'
                          : isEliminated
                          ? 'text-rose-400 line-through'
                          : 'text-white'
                      }`}
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    >
                      {player.score}
                    </span>
                  </div>

                  {/* SCORE ACTION BUTTONS: +1, -1, REMISE À 0 (Replaced +2 as requested by organizer!) */}
                  <div className="grid grid-cols-3 gap-1.5 mt-4">
                    <button
                      type="button"
                      onClick={() => adjustPlayerScore(player.id, 1)}
                      className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                      title={`Ajouter 1 point (Touche ${index + 1})`}
                    >
                      +1
                    </button>

                    <button
                      type="button"
                      onClick={() => adjustPlayerScore(player.id, -1)}
                      disabled={player.score <= 0}
                      className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold text-base flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all"
                      title="Retirer 1 point (Maj + Touche)"
                    >
                      -1
                    </button>

                    {/* NEW: Dedicated Remise à 0 button for this player */}
                    <button
                      type="button"
                      onClick={() => resetPlayerScore(player.id)}
                      className="py-3 rounded-xl bg-purple-950/70 hover:bg-purple-800 border border-purple-700/60 text-purple-200 hover:text-white font-bold text-xs flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all"
                      title="Remettre le score de ce joueur à 0 (pour manche suivante)"
                    >
                      <RotateCcw size={14} className="text-purple-300" />
                      <span className="text-[10px] tracking-tight">À zéro</span>
                    </button>
                  </div>

                  {/* BOTTOM SECONDARY ACTIONS: Winner / Eliminate */}
                  <div className="flex items-center justify-between gap-1.5 mt-2.5 pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => declareWinnerManually(player.id)}
                      className="flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold text-amber-300 hover:bg-amber-950/40 border border-transparent hover:border-amber-800/50 flex items-center justify-center gap-1 transition-colors"
                      title="Déclarer vainqueur de la manche"
                    >
                      <Trophy size={13} />
                      <span>Gagnant</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => togglePlayerElimination(player.id)}
                      className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                        isEliminated
                          ? 'bg-rose-900/60 text-white border border-rose-700'
                          : 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/30'
                      }`}
                      title="Éliminer / Rétablir ce joueur"
                    >
                      <UserX size={13} />
                      <span>{isEliminated ? 'Rétablir' : 'Éliminer'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM INFORMATIONAL SECTION: Clarification on connectivity & multi-device */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-purple-900/40 text-purple-300 border border-purple-700/50">
              ⚡ Connexion
            </span>
            <p>
              <strong>Sur 1 seul PC (avec écran HDMI) :</strong> aucune connexion internet n'est requise (synchronisation locale 0 ms).<br />
              <strong>Depuis smartphone ou 2 appareils distincts :</strong> la synchronisation passe automatiquement par Supabase en temps réel.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowSqlModal(true)}
            className="text-purple-400 hover:text-purple-300 font-bold underline underline-offset-4 shrink-0"
          >
            Script SQL Supabase →
          </button>
        </div>
      </main>

      {/* MODALS */}
      {showSponsors && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-scale-up">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                  <Building2 size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Gestionnaire des Sponsors & Logos</h3>
                  <p className="text-xs text-slate-400">
                    Personnalisez les logos affichés sur le tableau des scores (supermarché, galerie, partenaires)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSponsors(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <SponsorManager
                sponsors={state.sponsors}
                activeSponsorId={state.activeSponsorId}
                displayMode={state.sponsorDisplayMode}
                carouselSpeed={state.sponsorCarouselSpeed}
                onUpdateSponsors={(sponsors) => updateStateAndBroadcast({ sponsors })}
                onUpdateActiveSponsor={(id) => updateStateAndBroadcast({ activeSponsorId: id })}
                onUpdateDisplayMode={(mode) => updateStateAndBroadcast({ sponsorDisplayMode: mode })}
                onUpdateCarouselSpeed={(speed) => updateStateAndBroadcast({ sponsorCarouselSpeed: speed })}
                onClose={() => setShowSponsors(false)}
              />
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-right">
              <button
                type="button"
                onClick={() => setShowSponsors(false)}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow transition-colors"
              >
                Fermer & Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsModal
          state={state}
          onUpdateState={(partial) => updateStateAndBroadcast(partial)}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showHistory && (
        <HistoryModal
          history={history}
          onClearHistory={() => {
            setHistory([]);
            syncService.saveHistory([]);
          }}
          onClose={() => setShowHistory(false)}
        />
      )}

      {showShortcuts && (
        <HelpShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}

      <SqlSetupModal
        isOpen={showSqlModal}
        onClose={() => setShowSqlModal(false)}
        isCloudConnected={isCloudConnected}
      />

      <DmxModal
        isOpen={showDmxModal}
        onClose={() => setShowDmxModal(false)}
        state={state}
        isCloudConnected={isCloudConnected}
        onUpdateDmxConfig={(dmxConfig) => updateStateAndBroadcast({ dmxConfig })}
        onSendAction={(action) => syncService.sendAction(action)}
      />
    </div>
  );
};
