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

export type DmxColor = 'green' | 'blue' | 'yellow' | 'red';

export interface DmxPlayerMapping {
  green: string;  // Vert - Position d'attente (initialisation, 0-2 pts)
  blue: string;   // Bleu - A la main / Buzz
  yellow: string; // Jaune - Arrivé à 3 points (gagné manche / qualifié)
  red: string;    // Rouge - Éliminé
}

export interface DmxConfig {
  enabled: boolean;
  requireSunliteFocus: boolean; // Also applies to Daslight
  autoFocusSunlite: boolean;    // Also applies to Daslight
  requireDaslightFocus?: boolean;
  autoFocusDaslight?: boolean;
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
  answeringPlayerId?: string | null; // Player who buzzed first and has the floor
  lastUpdated: number;

  // DMX / Daslight configuration
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
  | { type: 'STATE_REQUEST' }
  | { type: 'TRIGGER_CONFETTI'; payload?: { intensity?: 'normal' | 'massive' } }
  | { type: 'PLAY_SOUND'; payload: { sound: 'correct' | 'wrong' | 'win' | 'tick' | 'alarm' | 'buzz' } }
  | { type: 'PLAYER_BUZZ'; payload: { playerId: string } }
  | { type: 'CLEAR_BUZZ' }
  | { type: 'DMX_TEST'; payload: { key: string; label?: string } }
  | { type: 'DMX_RESYNC' }
  | { type: 'PING' }
  | { type: 'PONG' };
