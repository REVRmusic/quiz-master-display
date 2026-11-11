export type PlayerStatus = 'active' | 'eliminated' | 'winner';

export interface Player {
  id: string;
  name: string;
  score: number;
  status: PlayerStatus;
  colorIndex?: number;
}

export type ThemeKey = 'purple' | 'blue' | 'emerald' | 'amber' | 'crimson' | 'dark';

export type SponsorDisplayMode = 'single' | 'carousel' | 'grid';

export interface Sponsor {
  id: string;
  name: string;
  logoUrl: string; // URL or base64 data
  enabled: boolean;
  order: number;
}

export type DmxColor = 'blue' | 'green' | 'red';

export interface DmxPlayerMapping {
  blue: string;
  green: string;
  red: string;
}

export interface DmxConfig {
  enabled: boolean;
  requireSunliteFocus: boolean;
  autoFocusSunlite: boolean;
  delayMs: number;
  playerMappings: DmxPlayerMapping[];
  intermissionKey: string;
  victoryFlashKey: string;
}

export interface QuizState {
  eventTitle: string;
  eventSubtitle?: string;
  nextSessionText: string;
  players: Player[];
  winScore: number; // e.g. 3, 0 means disabled
  theme: ThemeKey;
  soundEnabled: boolean;
  displayMode: 'scoreboard' | 'intermission' | 'winner';
  
  // Timer
  timerEnabled: boolean;
  timerDuration: number; // in seconds (e.g. 30)
  timerRemaining: number;
  timerRunning: boolean;
  
  // Sponsors
  sponsors: Sponsor[];
  activeSponsorId: string;
  sponsorDisplayMode: SponsorDisplayMode;
  sponsorCarouselSpeed: number; // in seconds (e.g. 6)
  
  // Round management
  currentRound: number;
  winnerPlayerId: string | null;
  lastUpdated: number;

  // DMX / Sunlite configuration
  dmxConfig?: DmxConfig;
}

export interface WinnerHistoryItem {
  id: string;
  timestamp: string; // ISO string
  formattedTime: string;
  round: number;
  winnerName: string;
  winningScore: number;
  eventTitle: string;
  playersSummary: { name: string; score: number }[];
}

export type SyncAction =
  | { type: 'STATE_UPDATE'; payload: QuizState }
  | { type: 'TRIGGER_CONFETTI'; payload?: { intensity?: 'normal' | 'massive' } }
  | { type: 'PLAY_SOUND'; payload: { sound: 'correct' | 'wrong' | 'win' | 'tick' | 'alarm' } }
  | { type: 'DMX_TEST'; payload: { key: string; label?: string } }
  | { type: 'DMX_RESYNC' }
  | { type: 'PING' }
  | { type: 'PONG' };
