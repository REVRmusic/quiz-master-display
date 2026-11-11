import { DmxConfig, QuizState, Sponsor } from '../types';

export const DEFAULT_DMX_CONFIG: DmxConfig = {
  enabled: true,
  requireSunliteFocus: false,
  autoFocusSunlite: true,
  delayMs: 80,
  playerMappings: [
    { blue: 'A', green: 'Z', red: 'E' }, // Joueur 1
    { blue: 'R', green: 'T', red: 'Y' }, // Joueur 2
    { blue: 'Q', green: 'S', red: 'D' }, // Joueur 3
    { blue: 'F', green: 'G', red: 'H' }, // Joueur 4
    { blue: 'W', green: 'X', red: 'C' }, // Joueur 5
    { blue: 'V', green: 'B', red: 'N' }, // Joueur 6
  ],
  intermissionKey: '',
  victoryFlashKey: '',
};

export const DEFAULT_SPONSORS: Sponsor[] = [
  {
    id: 'balaruc-default',
    name: 'Centre Commercial BALARUC',
    logoUrl: '/balaruc_logo.jpg',
    enabled: true,
    order: 0,
  },
  {
    id: 'sponsor-sample-1',
    name: 'E.Leclerc Balaruc',
    logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="90" viewBox="0 0 300 90"><rect width="300" height="90" rx="8" fill="%23004b93"/><text x="150" y="55" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="%23ffffff" text-anchor="middle">E.Leclerc</text></svg>',
    enabled: false,
    order: 1,
  },
  {
    id: 'sponsor-sample-2',
    name: 'Commerçants de la Galerie',
    logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="90" viewBox="0 0 300 90"><rect width="300" height="90" rx="8" fill="%23ffffff"/><circle cx="50" cy="45" r="22" fill="%23e11d48"/><text x="175" y="44" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="%231e293b" text-anchor="middle">LES BOUTIQUES</text><text x="175" y="65" font-family="Arial, sans-serif" font-size="14" fill="%2364748b" text-anchor="middle">DE LA GALERIE</text></svg>',
    enabled: false,
    order: 2,
  }
];

export const INITIAL_QUIZ_STATE: QuizState = {
  eventTitle: 'La galerie fête le Printemps du 6 au 16 mars',
  eventSubtitle: 'Le Grand Quiz des Commerçants',
  nextSessionText: 'Prochain Quiz à 10h30',
  players: [
    { id: 'p1', name: 'Joueur 1', score: 0, status: 'active', colorIndex: 0 },
    { id: 'p2', name: 'Joueur 2', score: 0, status: 'active', colorIndex: 1 },
    { id: 'p3', name: 'Joueur 3', score: 0, status: 'active', colorIndex: 2 },
    { id: 'p4', name: 'Joueur 4', score: 0, status: 'active', colorIndex: 3 },
  ],
  winScore: 3, // Matches `=SI(B5=3;"Gagné";"")` in their Excel
  theme: 'purple',
  soundEnabled: true,
  displayMode: 'scoreboard',
  
  timerEnabled: false,
  timerDuration: 30,
  timerRemaining: 30,
  timerRunning: false,
  
  sponsors: DEFAULT_SPONSORS,
  activeSponsorId: 'balaruc-default',
  sponsorDisplayMode: 'single',
  sponsorCarouselSpeed: 6,
  
  currentRound: 1,
  winnerPlayerId: null,
  lastUpdated: Date.now(),
  dmxConfig: DEFAULT_DMX_CONFIG,
};
