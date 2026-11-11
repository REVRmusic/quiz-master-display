import React, { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { QuizState, SyncAction } from '../types';
import { THEMES } from '../constants/themes';
import { SponsorDisplay } from './SponsorDisplay';
import { soundEffects } from '../services/audio';
import { syncService } from '../services/sync';
import { Maximize2, Minimize2, Trophy, Clock, Sparkles } from 'lucide-react';

interface DisplayViewProps {
  initialState?: QuizState;
}

export const DisplayView: React.FC<DisplayViewProps> = ({ initialState }) => {
  const [state, setState] = useState<QuizState>(() => initialState || syncService.loadState());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [animatedPlayerId, setAnimatedPlayerId] = useState<string | null>(null);
  const prevScoresRef = useRef<Record<string, number>>({});
  const controlsTimeoutRef = useRef<number | null>(null);

  const theme = THEMES[state.theme] || THEMES.purple;

  // Listen for sync state & actions
  useEffect(() => {
    // Send pong on initial mount so host knows display is alive
    syncService.sendAction({ type: 'PONG' });

    const unsubState = syncService.onState((newState) => {
      // Check for score changes to trigger animation & sounds
      newState.players.forEach((p) => {
        const prevScore = prevScoresRef.current[p.id];
        if (prevScore !== undefined && p.score > prevScore) {
          setAnimatedPlayerId(p.id);
          setTimeout(() => setAnimatedPlayerId(null), 900);
        }
        prevScoresRef.current[p.id] = p.score;
      });

      setState(newState);
    });

    const unsubAction = syncService.onAction((action: SyncAction) => {
      if (action.type === 'TRIGGER_CONFETTI') {
        launchConfetti(action.payload?.intensity || 'massive');
      } else if (action.type === 'PLAY_SOUND') {
        if (state.soundEnabled) {
          switch (action.payload.sound) {
            case 'correct':
              soundEffects.playCorrect();
              break;
            case 'wrong':
              soundEffects.playWrong();
              break;
            case 'win':
              soundEffects.playWin();
              break;
            case 'tick':
              soundEffects.playTick();
              break;
            case 'alarm':
              soundEffects.playAlarm();
              break;
          }
        }
      }
    });

    return () => {
      unsubState();
      unsubAction();
    };
  }, [state.soundEnabled]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const launchConfetti = (intensity: 'normal' | 'massive' = 'massive') => {
    const count = intensity === 'massive' ? 180 : 80;
    confetti({
      particleCount: count,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#fbbf24', '#f43f5e', '#3b82f6', '#10b981', '#a855f7', '#ffffff'],
    });

    if (intensity === 'massive') {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          angle: 60,
          spread: 60,
          origin: { x: 0, y: 0.7 },
        });
        confetti({
          particleCount: 100,
          angle: 120,
          spread: 60,
          origin: { x: 1, y: 0.7 },
        });
      }, 300);
    }
  };

  // Mouse move handler to momentarily show discreet fullscreen button
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = window.setTimeout(() => {
      setShowControls(false);
    }, 2500);
  };

  // Format timer
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      style={{ backgroundColor: theme.bgColor }}
      className={`min-h-screen w-screen h-screen overflow-hidden flex flex-col justify-between p-6 sm:p-8 md:p-10 text-white select-none relative bg-gradient-to-b ${theme.bgGradient} transition-colors duration-500`}
    >
      {/* Discreet Fullscreen button */}
      <button
        onClick={toggleFullscreen}
        aria-label="Plein écran"
        className={`fixed top-4 right-4 z-50 p-2.5 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-md text-white/70 hover:text-white transition-all duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
      </button>

      {/* TOP HEADER: Event Title & Subtitle & Optional Timer */}
      <header className="w-full text-center py-2 flex flex-col items-center justify-center relative">
        <div className="max-w-6xl mx-auto px-4">
          <h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight drop-shadow-md text-white transition-all duration-300"
            style={{
              textShadow: '0 4px 16px rgba(0, 0, 0, 0.45), 0 1px 2px rgba(0, 0, 0, 0.6)',
              fontFamily: 'Outfit, sans-serif'
            }}
          >
            {state.eventTitle}
          </h1>
          {state.eventSubtitle && (
            <p className="mt-1.5 text-lg sm:text-xl md:text-2xl font-semibold tracking-wide text-white/90 drop-shadow">
              {state.eventSubtitle}
            </p>
          )}
        </div>

        {/* Live Timer badge (if active and running) */}
        {state.timerEnabled && (
          <div
            className={`mt-3 inline-flex items-center gap-2.5 px-6 py-2 rounded-full border shadow-xl backdrop-blur-md transition-all duration-300 ${
              state.timerRemaining <= 5 && state.timerRunning
                ? 'bg-rose-600/90 border-rose-400 animate-pulse text-white scale-110'
                : 'bg-black/40 border-white/20 text-white'
            }`}
          >
            <Clock size={22} className={state.timerRunning ? 'animate-spin' : ''} style={{ animationDuration: '4s' }} />
            <span className="font-mono text-2xl md:text-3xl font-extrabold tracking-wider">
              {formatTimer(state.timerRemaining)}
            </span>
          </div>
        )}
      </header>

      {/* INTERMISSION MODE (Écran d'attente / pause entre 2 quiz) */}
      {state.displayMode === 'intermission' ? (
        <main className="flex-1 flex flex-col items-center justify-center text-center my-auto px-4 animate-scale-up">
          <div className="bg-black/30 backdrop-blur-xl border border-white/25 rounded-3xl p-8 sm:p-12 max-w-4xl shadow-2xl relative overflow-hidden">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-400 text-purple-950 font-black text-sm uppercase tracking-widest mb-6 shadow-lg">
              <Sparkles size={18} /> Prochaine Session
            </div>

            <h2 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white mb-4">
              {state.nextSessionText}
            </h2>

            <p className="text-xl sm:text-2xl text-white/90 max-w-2xl mx-auto font-medium mb-8">
              Venez tester vos connaissances sur notre stand et tentez de remporter des cartes cadeaux offertes par vos commerçants !
            </p>

            {/* Showcase sponsors in intermission */}
            <div className="pt-6 border-t border-white/20 flex flex-col items-center">
              <p className="text-sm font-bold uppercase tracking-wider text-white/70 mb-4">
                En partenariat avec :
              </p>
              <div className="flex flex-wrap justify-center items-center gap-6">
                {state.sponsors.filter(s => s.enabled).map((s) => (
                  <div key={s.id} className="bg-white/95 p-3 px-6 rounded-2xl shadow-xl border border-white/40">
                    <img src={s.logoUrl} alt={s.name} className="h-16 max-w-[260px] object-contain" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      ) : (
        /* SCOREBOARD MODE: The players grid */
        <main className="flex-1 flex items-center justify-center py-4 w-full max-w-7xl mx-auto px-2 sm:px-4">
          <div
            className={`w-full grid gap-4 sm:gap-6 md:gap-8 items-stretch ${
              state.players.length === 2
                ? 'grid-cols-2 max-w-4xl'
                : state.players.length === 3
                ? 'grid-cols-3 max-w-5xl'
                : state.players.length === 4
                ? 'grid-cols-2 lg:grid-cols-4'
                : state.players.length === 5
                ? 'grid-cols-2 md:grid-cols-5'
                : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
            }`}
          >
            {state.players.map((player) => {
              const isWinner =
                player.status === 'winner' ||
                (state.winScore > 0 && player.score >= state.winScore);
              const isEliminated = player.status === 'eliminated';
              const isAnimated = animatedPlayerId === player.id;

              return (
                <div
                  key={player.id}
                  className={`relative flex flex-col justify-between items-center rounded-3xl p-6 md:p-8 transition-all duration-300 shadow-2xl border ${
                    isWinner
                      ? 'bg-gradient-to-b from-amber-500/30 to-amber-900/40 border-amber-400 ring-4 ring-amber-400/50 shadow-amber-500/40 scale-105 z-20 animate-pulse-fast'
                      : isEliminated
                      ? 'bg-black/60 border-rose-900/60 opacity-55 grayscale'
                      : `${theme.cardBg} ${theme.cardBorder} hover:border-white/40`
                  } ${isAnimated ? 'scale-105 ring-2 ring-white' : ''}`}
                  style={{ minHeight: '280px' }}
                >
                  {/* WINNER BADGE OVERLAY */}
                  {isWinner && (
                    <div className="absolute -top-5 inset-x-0 flex justify-center z-30">
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-sm md:text-base tracking-wider shadow-xl animate-bounce">
                        <Trophy size={18} className="text-amber-900" />
                        GAGNÉ !
                      </span>
                    </div>
                  )}

                  {/* ELIMINATED BADGE OVERLAY */}
                  {isEliminated && (
                    <div className="absolute -top-4 inset-x-0 flex justify-center z-30">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-rose-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg">
                        ÉLIMINÉ
                      </span>
                    </div>
                  )}

                  {/* PLAYER NAME */}
                  <div className="w-full text-center">
                    <h2
                      className={`text-xl sm:text-2xl md:text-3xl font-extrabold uppercase tracking-wider line-clamp-1 ${
                        isWinner ? 'text-amber-200' : 'text-white'
                      }`}
                      style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                      title={player.name}
                    >
                      {player.name}
                    </h2>
                  </div>

                  {/* GIANT SCORE DISPLAY */}
                  <div className="my-auto py-4 flex flex-col items-center justify-center">
                    <span
                      className={`font-black tracking-tighter leading-none select-none transition-transform duration-200 ${
                        isAnimated ? 'scale-125' : 'scale-100'
                      } ${
                        isWinner
                          ? 'text-amber-300 drop-shadow-[0_0_25px_rgba(251,191,36,0.6)]'
                          : isEliminated
                          ? 'text-rose-400 line-through'
                          : `${theme.scoreColor} drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]`
                      }`}
                      style={{
                        fontSize: 'clamp(5.5rem, 11vw, 9.5rem)',
                        fontFamily: 'Outfit, sans-serif',
                      }}
                    >
                      {player.score}
                    </span>
                  </div>

                  {/* BOTTOM STATUS FOOTER OF CARD */}
                  <div className="w-full text-center pt-2 min-h-[32px] flex items-center justify-center">
                    {isWinner ? (
                      <span className="text-sm font-bold text-amber-300 flex items-center gap-1">
                        🏆 Vainqueur de la manche
                      </span>
                    ) : state.winScore > 0 ? (
                      <span className="text-xs uppercase tracking-widest text-white/50 font-medium">
                        Objectif : {state.winScore} pts
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* FOOTER BAR: Matches original PPTX layout with "Prochain Quiz à 10h30" bottom left & Sponsor logo bottom right */}
      <footer className="w-full flex items-end justify-between gap-4 pt-4 mt-auto">
        {/* Left: Next Session Text (Matches the yellow italic text in PPTX) */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span
              className="text-xl sm:text-2xl md:text-3xl font-black italic tracking-wide text-yellow-300 drop-shadow-lg"
              style={{
                textShadow: '0 2px 8px rgba(0,0,0,0.7)',
                fontFamily: 'Outfit, sans-serif',
              }}
            >
              {state.nextSessionText}
            </span>
          </div>
        </div>

        {/* Right: Sponsor Logo (White card rounded or banner matching original Balaruc presentation) */}
        <div className="flex items-center justify-end">
          <SponsorDisplay
            sponsors={state.sponsors}
            activeSponsorId={state.activeSponsorId}
            displayMode={state.sponsorDisplayMode}
            carouselSpeed={state.sponsorCarouselSpeed}
            themeBgColor={theme.bgColor}
          />
        </div>
      </footer>
    </div>
  );
};
