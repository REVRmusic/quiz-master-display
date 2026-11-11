import React, { useState, useEffect, useRef } from 'react';
import { DmxConfig, QuizState, SyncAction } from '../types';
import { DEFAULT_DMX_CONFIG } from '../constants/defaultData';
import { getPlayerDmxColor, getDmxColorMeta, resolveDmxConfig } from '../utils/dmx';
import {
  Lightbulb,
  Download,
  RefreshCw,
  Keyboard,
  BookOpen,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Play,
  RotateCcw,
  Timer,
  Terminal,
  Shield,
  ExternalLink,
} from 'lucide-react';

interface CompanionLog {
  time: string;
  level: string;
  message: string;
}

interface CompanionStatus {
  supabaseConnected: boolean;
  sunliteWindow: string;
  activeWindow: string;
  playerColors: Record<number, string>;
  dmxEnabled: boolean;
  logs: CompanionLog[];
  version: string;
}

interface DmxPanelProps {
  state: QuizState;
  isCloudConnected: boolean;
  onUpdateDmxConfig: (cfg: DmxConfig) => void;
  onSendAction: (action: SyncAction) => void;
  isStandalonePage?: boolean;
}

export const DmxPanel: React.FC<DmxPanelProps> = ({
  state,
  isCloudConnected,
  onUpdateDmxConfig,
  onSendAction,
  isStandalonePage = false,
}) => {
  const [activeTab, setActiveTab] = useState<'monitor' | 'mapping' | 'guide'>('monitor');
  const [companionConnected, setCompanionConnected] = useState(false);
  const [companionStatus, setCompanionStatus] = useState<CompanionStatus | null>(null);
  const [countdownInfo, setCountdownInfo] = useState<{ key: string; label: string; sec: number } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const dmx = resolveDmxConfig(state.dmxConfig);

  // Connect to local Windows Companion App WebSocket (ws://127.0.0.1:8765/ws) if running on this PC
  useEffect(() => {
    let timer: number | null = null;
    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;
      try {
        const ws = new WebSocket('ws://127.0.0.1:8765/ws');
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setCompanionConnected(true);
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'STATUS' && msg.data) {
              setCompanionStatus(msg.data);
            }
          } catch {
            // ignore malformed JSON
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setCompanionConnected(false);
          wsRef.current = null;
          timer = window.setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        timer = window.setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // If browser is online and local companion Supabase WS is down, forward fallback state
  useEffect(() => {
    if (
      companionConnected &&
      companionStatus &&
      !companionStatus.supabaseConnected &&
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      wsRef.current.send(JSON.stringify({ type: 'STATE_FALLBACK', state }));
    }
  }, [state, companionConnected, companionStatus?.supabaseConnected]);

  // Trigger test key (via local WS if present for 0ms, otherwise via Supabase action)
  const triggerTestKey = (key: string, label: string) => {
    if (!key.trim()) return;
    if (companionConnected && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'TEST_KEY', key, label }));
    } else {
      onSendAction({ type: 'DMX_TEST', payload: { key, label } });
    }
  };

  // Trigger full resync
  const triggerResyncAll = () => {
    if (companionConnected && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'RESYNC_ALL' }));
    } else {
      onSendAction({ type: 'DMX_RESYNC' });
    }
  };

  // 3-second countdown helper to map a shortcut directly into Sunlite's "Keyboard shortcut" prompt
  const startDelayedMapSend = (key: string, label: string) => {
    if (!key.trim() || countdownInfo) return;
    let remaining = 3;
    setCountdownInfo({ key, label, sec: remaining });

    const interval = window.setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdownInfo({ key, label, sec: remaining });
      } else {
        clearInterval(interval);
        setCountdownInfo(null);
        triggerTestKey(key, `Mapping Sunlite (${label})`);
      }
    }, 1000);
  };

  const updateMapping = (playerIndex: number, color: 'blue' | 'green' | 'red', value: string) => {
    const nextMappings = [...dmx.playerMappings];
    nextMappings[playerIndex] = {
      ...nextMappings[playerIndex],
      [color]: value.toUpperCase(),
    };
    onUpdateDmxConfig({
      ...dmx,
      playerMappings: nextMappings,
    });
  };

  // Capture key combination inside shortcut inputs
  const handleShortcutKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    onCapture: (combo: string) => void
  ) => {
    // Allow Backspace/Delete to clear
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      onCapture('');
      return;
    }
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
      return;
    }
    e.preventDefault();
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');

    let keyName = e.key;
    if (keyName === ' ') keyName = 'Space';
    else if (keyName.length === 1) keyName = keyName.toUpperCase();
    else if (e.code.startsWith('Numpad')) keyName = e.code.toUpperCase();
    else keyName = keyName.toUpperCase();

    parts.push(keyName);
    onCapture(parts.join('+'));
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* STATUS BANNER + DOWNLOAD BUTTON */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Card */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${dmx.enabled ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                <Lightbulb size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Pilotage DMX / Sunlite Temps Réel</h3>
                <p className="text-xs text-slate-400">
                  Synchronise automatiquement les PAR LEDs sur votre PC Lumières Windows
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onUpdateDmxConfig({ ...dmx, enabled: !dmx.enabled })}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                dmx.enabled
                  ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {dmx.enabled ? 'Pilotage DMX Activé ✓' : 'Pilotage DMX En Pause'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold ${
                isCloudConnected
                  ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-700/50 text-amber-300'
              }`}
            >
              <Radio size={12} className={isCloudConnected ? 'animate-pulse' : ''} />
              {isCloudConnected ? 'Cloud Supabase Connecté' : 'Cloud hors-ligne'}
            </span>

            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold ${
                companionConnected
                  ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <Monitor size={12} />
              {companionConnected
                ? `Companion Windows Connecté (v${companionStatus?.version || '1.0'})`
                : 'Companion non détecté sur ce PC'}
            </span>

            {companionConnected && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold ${
                  companionStatus?.sunliteWindow
                    ? 'bg-sky-950/40 border-sky-700/50 text-sky-300'
                    : 'bg-amber-950/40 border-amber-700/50 text-amber-300'
                }`}
              >
                {companionStatus?.sunliteWindow ? (
                  <>
                    <CheckCircle2 size={12} /> Sunlite : {companionStatus.sunliteWindow}
                  </>
                ) : (
                  <>
                    <AlertTriangle size={12} /> Fenêtre Sunlite non détectée
                  </>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Download Companion App Card */}
        <div className="bg-gradient-to-br from-purple-950/70 via-slate-900 to-indigo-950/70 border border-purple-700/50 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-lg">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              PC Lumières Windows
            </span>
            <h4 className="font-bold text-sm text-white mt-2">App Companion Windows</h4>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
              Exécutable autonome (7 Mo, sans installation) à lancer sur le PC où tourne Sunlite.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <a
              href="/downloads/QuizMaster-DMX-Companion.exe"
              download="QuizMaster-DMX-Companion.exe"
              className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <Download size={15} />
              <span>Télécharger (.exe Windows)</span>
            </a>
            {!isStandalonePage && (
              <a
                href="?view=dmx"
                target="_blank"
                rel="noreferrer"
                className="w-full py-1.5 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <ExternalLink size={12} />
                <span>Ouvrir la page dédiée PC Lumières</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* COUNTDOWN OVERLAY BANNER FOR SUNLITE MAPPING */}
      {countdownInfo && (
        <div className="bg-amber-500/20 border border-amber-400 rounded-2xl p-4 flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <Timer size={24} className="text-amber-300" />
            <div>
              <p className="font-bold text-sm text-amber-200">
                Cliquez maintenant dans la case « Raccourci clavier » de Sunlite !
              </p>
              <p className="text-xs text-amber-100/80">
                Envoi automatique de <strong>[{countdownInfo.key}]</strong> ({countdownInfo.label}) dans {countdownInfo.sec}s...
              </p>
            </div>
          </div>
          <span className="text-3xl font-black text-amber-300 font-mono">{countdownInfo.sec}</span>
        </div>
      )}

      {/* TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('monitor')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'monitor'
              ? 'bg-purple-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Lightbulb size={15} />
          <span>Moniteur PAR LEDs & Tests</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mapping')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'mapping'
              ? 'bg-purple-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Keyboard size={15} />
          <span>Touches Clavier & Options</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('guide')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'guide'
              ? 'bg-purple-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BookOpen size={15} />
          <span>Guide Configuration Sunlite</span>
        </button>
      </div>

      {/* TAB 1: LIVE MONITOR */}
      {activeTab === 'monitor' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              Règle appliquée en direct : <strong className="text-sky-300">Bleu</strong> (0, 1 ou 2 pts) •{' '}
              <strong className="text-emerald-300">Vert</strong> (Gagnant {state.winScore > 0 ? `${state.winScore} pts` : ''}) •{' '}
              <strong className="text-rose-300">Rouge</strong> (Éliminé)
            </p>

            <button
              type="button"
              onClick={triggerResyncAll}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <RefreshCw size={14} />
              <span>Resynchroniser tous les projecteurs</span>
            </button>
          </div>

          {/* Virtual PAR LEDs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {state.players.map((player, idx) => {
              const color = getPlayerDmxColor(player, state.winScore);
              const meta = getDmxColorMeta(color);
              const mapping = dmx.playerMappings[idx] || { blue: '', green: '', red: '' };
              const activeKey = mapping[color];

              return (
                <div
                  key={player.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center gap-3"
                >
                  <div className="w-full flex items-center justify-between text-xs text-slate-400">
                    <span className="font-bold text-white truncate">{player.name}</span>
                    <span className="font-mono">{player.score} pt{player.score > 1 ? 's' : ''}</span>
                  </div>

                  {/* Glowing PAR LED Circle */}
                  <div
                    className={`w-20 h-20 rounded-full border-4 border-slate-800 flex flex-col items-center justify-center transition-all duration-300 ${
                      color === 'green'
                        ? 'bg-emerald-500 text-slate-950'
                        : color === 'red'
                        ? 'bg-rose-600 text-white'
                        : 'bg-sky-500 text-slate-950'
                    }`}
                    style={{ boxShadow: meta.glowStyle }}
                  >
                    <span className="font-black text-xs tracking-wider">{meta.label}</span>
                    {activeKey && (
                      <span className="text-[10px] font-mono font-bold opacity-80">[{activeKey}]</span>
                    )}
                  </div>

                  {/* Quick Test Buttons */}
                  <div className="w-full grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => triggerTestKey(mapping.blue, `Test ${player.name} BLEU`)}
                      disabled={!mapping.blue}
                      className="py-1.5 rounded-lg bg-sky-950/60 hover:bg-sky-900 border border-sky-700/50 text-sky-300 text-[11px] font-bold disabled:opacity-30 transition-colors"
                      title={`Envoyer touche [${mapping.blue}]`}
                    >
                      Bleu [{mapping.blue || '-'}]
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerTestKey(mapping.green, `Test ${player.name} VERT`)}
                      disabled={!mapping.green}
                      className="py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/50 text-emerald-300 text-[11px] font-bold disabled:opacity-30 transition-colors"
                      title={`Envoyer touche [${mapping.green}]`}
                    >
                      Vert [{mapping.green || '-'}]
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerTestKey(mapping.red, `Test ${player.name} ROUGE`)}
                      disabled={!mapping.red}
                      className="py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-700/50 text-rose-300 text-[11px] font-bold disabled:opacity-30 transition-colors"
                      title={`Envoyer touche [${mapping.red}]`}
                    >
                      Rouge [{mapping.red || '-'}]
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Companion Logs (when connected locally on PC 2) */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Terminal size={14} className="text-purple-400" />
                Journal en direct du Companion Windows
              </h4>
              <span className="text-[11px] text-slate-500">
                {companionConnected ? 'Flux temps réel actif (Port 8765)' : 'Ouvrez cette page sur le PC Lumières pour voir les logs locaux'}
              </span>
            </div>

            <div className="font-mono text-xs space-y-1 max-h-40 overflow-y-auto text-slate-300">
              {companionStatus?.logs && companionStatus.logs.length > 0 ? (
                [...companionStatus.logs].reverse().map((log, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-slate-500 shrink-0">{log.time}</span>
                    <span
                      className={
                        log.level === 'key'
                          ? 'text-cyan-300'
                          : log.level === 'error'
                          ? 'text-rose-400'
                          : log.level === 'warn'
                          ? 'text-amber-300'
                          : 'text-emerald-400'
                      }
                    >
                      {log.message}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 italic">
                  {companionConnected
                    ? 'En attente d\'événements quiz...'
                    : 'Companion Windows non connecté sur cet ordinateur (normal si vous êtes sur le PC Régie).'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KEY MAPPINGS & SUNLITE OPTIONS */}
      {activeTab === 'mapping' && (
        <div className="space-y-5">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-300">
              Cliquez dans une case et appuyez sur la touche voulue (ex: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-purple-300">A</kbd>, <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-purple-300">F2</kbd>, <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-purple-300">Ctrl+Shift+A</kbd>).
              Utilisez <strong>3s</strong> pour envoyer la touche dans Sunlite pendant la capture du raccourci !
            </p>
            <button
              type="button"
              onClick={() => onUpdateDmxConfig(DEFAULT_DMX_CONFIG)}
              className="text-xs text-slate-400 hover:text-purple-300 flex items-center gap-1"
            >
              <RotateCcw size={13} /> Touches par défaut
            </button>
          </div>

          {/* Players Mapping Table */}
          <div className="space-y-2.5">
            {state.players.map((player, idx) => {
              const mapping = dmx.playerMappings[idx] || { blue: '', green: '', red: '' };
              return (
                <div
                  key={player.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 grid grid-cols-1 md:grid-cols-4 gap-3 items-center"
                >
                  <div className="font-bold text-sm text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 text-purple-400 font-mono text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="truncate">{player.name}</span>
                  </div>

                  {(['blue', 'green', 'red'] as const).map((col) => {
                    const colorTitle = col === 'blue' ? 'Bleu (Actif)' : col === 'green' ? 'Vert (Gagnant)' : 'Rouge (Éliminé)';
                    const borderColor =
                      col === 'blue'
                        ? 'border-sky-700/60 focus:border-sky-400'
                        : col === 'green'
                        ? 'border-emerald-700/60 focus:border-emerald-400'
                        : 'border-rose-700/60 focus:border-rose-400';

                    return (
                      <div key={col} className="flex items-center gap-1.5">
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">
                            {colorTitle}
                          </label>
                          <input
                            type="text"
                            value={mapping[col]}
                            onKeyDown={(e) =>
                              handleShortcutKeyDown(e, (val) => updateMapping(idx, col, val))
                            }
                            onChange={(e) => updateMapping(idx, col, e.target.value)}
                            placeholder="Touche..."
                            className={`w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border ${borderColor} text-white font-mono text-xs text-center focus:outline-none`}
                          />
                        </div>

                        <div className="flex flex-col gap-1 pt-4">
                          <button
                            type="button"
                            onClick={() => startDelayedMapSend(mapping[col], `${player.name} ${colorTitle}`)}
                            disabled={!mapping[col]}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-purple-600 text-[10px] font-bold text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
                            title="Envoyer dans 3 secondes (pratique pour capturer la touche dans Sunlite)"
                          >
                            3s
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Optional Global Scenes */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Touche Mode Pause / Attente (optionnel)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={dmx.intermissionKey}
                  onKeyDown={(e) =>
                    handleShortcutKeyDown(e, (val) =>
                      onUpdateDmxConfig({ ...dmx, intermissionKey: val })
                    )
                  }
                  onChange={(e) => onUpdateDmxConfig({ ...dmx, intermissionKey: e.target.value })}
                  placeholder="Aucune (ex: P)"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => triggerTestKey(dmx.intermissionKey, 'Scène Pause')}
                  disabled={!dmx.intermissionKey}
                  className="px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold disabled:opacity-30"
                >
                  <Play size={13} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Touche Effet Victoire / Confettis (optionnel)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={dmx.victoryFlashKey}
                  onKeyDown={(e) =>
                    handleShortcutKeyDown(e, (val) =>
                      onUpdateDmxConfig({ ...dmx, victoryFlashKey: val })
                    )
                  }
                  onChange={(e) => onUpdateDmxConfig({ ...dmx, victoryFlashKey: e.target.value })}
                  placeholder="Aucune (ex: M)"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => triggerTestKey(dmx.victoryFlashKey, 'Effet Victoire')}
                  disabled={!dmx.victoryFlashKey}
                  className="px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold disabled:opacity-30"
                >
                  <Play size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Safety & Focus Options */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
              <Shield size={15} /> Options de Focus Windows (Sunlite)
            </h4>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-white">Focus automatique sur Sunlite avant envoi</p>
                <p className="text-[11px] text-slate-400">
                  Si Sunlite a perdu le focus par erreur, le companion réactive sa fenêtre automatiquement.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onUpdateDmxConfig({ ...dmx, autoFocusSunlite: !dmx.autoFocusSunlite })}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                  dmx.autoFocusSunlite ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {dmx.autoFocusSunlite ? 'Activé ✓' : 'Désactivé'}
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-800">
              <div>
                <p className="text-xs font-bold text-white">Sécurité stricte : ignorer si Sunlite n'est pas actif</p>
                <p className="text-[11px] text-slate-400">
                  Empêche d'envoyer les touches dans un autre logiciel si Sunlite n'est pas ouvert au premier plan.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateDmxConfig({ ...dmx, requireSunliteFocus: !dmx.requireSunliteFocus })
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                  dmx.requireSunliteFocus ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {dmx.requireSunliteFocus ? 'Strict ✓' : 'Souple'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STEP-BY-STEP SUNLITE SETUP GUIDE */}
      {activeTab === 'guide' && (
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">1</span>
              Créer les Pages / Boutons indépendants dans Sunlite (Suite 2 ou Suite 3)
            </h4>
            <p>
              Pour que chaque PAR LED (Joueur 1, 2, 3, 4) change de couleur <strong>indépendamment des autres</strong> (ex: Joueur 1 en Vert pendant que Joueurs 2 et 3 restent en Bleu et Joueur 4 en Rouge) :
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 pl-2">
              <li>
                Créez <strong>4 Pages distinctes</strong> dans Sunlite : <code className="text-purple-300">Joueur 1</code>, <code className="text-purple-300">Joueur 2</code>, <code className="text-purple-300">Joueur 3</code>, <code className="text-purple-300">Joueur 4</code> (ou 1 seule page contenant 4 <em>Groupes exclusifs</em>).
              </li>
              <li>
                Dans chaque page de joueur, créez <strong>3 boutons (Switch / Scène)</strong> : <strong className="text-sky-300">Bleu</strong>, <strong className="text-emerald-300">Vert</strong>, <strong className="text-rose-300">Rouge</strong>.
              </li>
              <li>
                <strong>Très important :</strong> Lors de la création des 3 boutons du Joueur 1, n'enregistrez <strong>QUE les canaux DMX du projecteur 1</strong> (laissez les autres projecteurs sur OFF / non affectés !). Faites de même pour J2, J3 et J4.
              </li>
              <li>
                Réglez les 3 boutons d'un même joueur en mode <strong>Exclusif (ou « Libérer les autres boutons de la page »)</strong> : ainsi, quand le bouton <em>Vert</em> s'allume, il coupe automatiquement le bouton <em>Bleu</em> de ce joueur, sans toucher aux autres joueurs !
              </li>
            </ul>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">2</span>
              Mapper les Raccourcis Clavier sur chaque bouton Sunlite
            </h4>
            <p>
              Dans Sunlite, faites un <strong>clic droit</strong> sur chaque bouton de couleur → <strong>Paramètres du bouton</strong> → champ <strong>Raccourci clavier</strong> (ou menu <em>Déclenchement clavier</em>), et associez les touches configurées dans l'onglet précédent :
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {state.players.slice(0, 4).map((p, i) => {
                const m = dmx.playerMappings[i] || DEFAULT_DMX_CONFIG.playerMappings[i];
                return (
                  <div key={p.id} className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 space-y-1">
                    <div className="font-bold text-white text-center border-b border-slate-800 pb-1">{p.name}</div>
                    <div className="flex justify-between"><span className="text-sky-300">Bleu :</span> <kbd className="font-mono text-white">{m.blue}</kbd></div>
                    <div className="flex justify-between"><span className="text-emerald-300">Vert :</span> <kbd className="font-mono text-white">{m.green}</kbd></div>
                    <div className="flex justify-between"><span className="text-rose-300">Rouge :</span> <kbd className="font-mono text-white">{m.red}</kbd></div>
                  </div>
                );
              })}
            </div>
            <p className="text-amber-300/90 text-[11px]">
              💡 Astuce : Sur le PC Windows, ouvrez cette page dans le navigateur à côté de Sunlite, cliquez dans la case raccourci de Sunlite, puis utilisez le bouton <strong>« 3s »</strong> dans l'onglet <em>Touches Clavier</em> pour que l'app tape la touche exacte toute seule !
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">3</span>
              Installation le Jour du Quiz (2 Ordinateurs)
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 pl-2">
              <li>
                <strong>PC 1 (Régie & Écran Public) :</strong> Ouvrez la Régie + l'Écran Public. Tout changement de score est envoyé vers Supabase en temps réel.
              </li>
              <li>
                <strong>PC 2 (PC Lumières Windows dédié) :</strong>
                <ol className="list-decimal list-inside pl-5 mt-1 space-y-1 text-slate-400">
                  <li>Branchez l'interface DMX USB et lancez <strong>Sunlite Suite</strong>.</li>
                  <li>Ouvrez cette page (<code>?view=dmx</code>) dans votre navigateur pour suivre le moniteur (facultatif mais pratique).</li>
                  <li>Lancez <strong>QuizMaster-DMX-Companion.exe</strong>.</li>
                  <li><strong>Cliquez sur la fenêtre Sunlite</strong> pour qu'elle reste au premier plan (focus actif) pendant tout le quiz.</li>
                </ol>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
