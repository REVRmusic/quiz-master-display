import React, { useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { soundEffects } from '../services/audio';

interface TimerWidgetProps {
  enabled: boolean;
  duration: number;
  remaining: number;
  isRunning: boolean;
  soundEnabled: boolean;
  onToggleTimer: (enabled: boolean) => void;
  onSetDuration: (duration: number) => void;
  onSetRemaining: (remaining: number) => void;
  onSetRunning: (running: boolean) => void;
  onBroadcastTimer: (remaining: number, running: boolean) => void;
}

export const TimerWidget: React.FC<TimerWidgetProps> = ({
  enabled,
  duration,
  remaining,
  isRunning,
  soundEnabled,
  onToggleTimer,
  onSetDuration,
  onSetRemaining,
  onSetRunning,
  onBroadcastTimer,
}) => {
  // Timer countdown effect
  useEffect(() => {
    let interval: number | null = null;
    if (isRunning && enabled) {
      interval = window.setInterval(() => {
        if (remaining > 1) {
          const next = remaining - 1;
          onSetRemaining(next);
          onBroadcastTimer(next, true);

          // Audio ticks during last 5 seconds
          if (next <= 5 && soundEnabled) {
            soundEffects.playTick();
          }
        } else if (remaining === 1) {
          onSetRemaining(0);
          onSetRunning(false);
          onBroadcastTimer(0, false);
          if (soundEnabled) {
            soundEffects.playAlarm();
          }
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, remaining, enabled, soundEnabled]);

  const handleStartPause = () => {
    if (!enabled) {
      onToggleTimer(true);
    }
    const nextRunning = !isRunning;
    onSetRunning(nextRunning);
    onBroadcastTimer(remaining, nextRunning);
  };

  const handleReset = (newDuration?: number) => {
    const dur = newDuration !== undefined ? newDuration : duration;
    onSetDuration(dur);
    onSetRemaining(dur);
    onSetRunning(false);
    onBroadcastTimer(dur, false);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-purple-400" />
          <h4 className="font-bold text-sm text-white">Chrono / Minuteur Quiz</h4>
        </div>
        <button
          type="button"
          onClick={() => onToggleTimer(!enabled)}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
            enabled
              ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          {enabled ? 'Visible sur écran' : 'Désactivé'}
        </button>
      </div>

      <div className="flex items-center justify-between gap-4">
        {/* Giant Timer Display */}
        <div className="flex items-center gap-3">
          <div
            className={`font-mono text-3xl sm:text-4xl font-extrabold px-4 py-1.5 rounded-xl border transition-colors ${
              remaining <= 5 && isRunning
                ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
                : 'bg-slate-950 border-slate-700 text-white'
            }`}
          >
            {formatTimer(remaining)}
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5">
            {[10, 30, 45, 60].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleReset(preset)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  duration === preset
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {preset}s
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleStartPause}
            className={`p-3 rounded-xl font-bold flex items-center gap-2 text-sm shadow-lg transition-all ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isRunning ? <Pause size={18} /> : <Play size={18} />}
            <span className="hidden sm:inline">{isRunning ? 'Pause' : 'Lancer'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleReset()}
            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Remettre à zéro"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
