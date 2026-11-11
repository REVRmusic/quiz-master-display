import { ThemeKey } from '../types';

export interface ThemeConfig {
  id: ThemeKey;
  name: string;
  description: string;
  bgColor: string; // Tailwind class or hex
  bgGradient: string;
  accentColor: string;
  cardBg: string;
  cardBorder: string;
  scoreColor: string;
  nameColor: string;
  headerTitleColor: string;
  glowColor: string;
  previewBg: string;
}

export const THEMES: Record<ThemeKey, ThemeConfig> = {
  purple: {
    id: 'purple',
    name: 'Violet Printemps (Original)',
    description: 'Thème fidèle au fichier PowerPoint d\'origine (#7030A0)',
    bgColor: '#7030A0',
    bgGradient: 'from-[#501c77] via-[#7030A0] to-[#5a2186]',
    accentColor: '#fbbf24',
    cardBg: 'bg-white/10 backdrop-blur-md',
    cardBorder: 'border-white/20',
    scoreColor: 'text-white',
    nameColor: 'text-white',
    headerTitleColor: 'text-white',
    glowColor: 'rgba(251, 191, 36, 0.4)',
    previewBg: 'bg-purple-800',
  },
  blue: {
    id: 'blue',
    name: 'Bleu Jeu TV & Grand Écran',
    description: 'Style dynamique jeu télévisé haute intensité',
    bgColor: '#0f172a',
    bgGradient: 'from-blue-950 via-indigo-900 to-slate-950',
    accentColor: '#38bdf8',
    cardBg: 'bg-blue-900/30 backdrop-blur-md',
    cardBorder: 'border-blue-500/30',
    scoreColor: 'text-cyan-300',
    nameColor: 'text-blue-100',
    headerTitleColor: 'text-white',
    glowColor: 'rgba(56, 189, 248, 0.5)',
    previewBg: 'bg-blue-900',
  },
  emerald: {
    id: 'emerald',
    name: 'Vert Galerie & Printemps',
    description: 'Ambiance nature, fraîcheur et dynamisme commercial',
    bgColor: '#064e3b',
    bgGradient: 'from-emerald-950 via-teal-900 to-green-950',
    accentColor: '#34d399',
    cardBg: 'bg-emerald-900/30 backdrop-blur-md',
    cardBorder: 'border-emerald-500/30',
    scoreColor: 'text-emerald-300',
    nameColor: 'text-emerald-100',
    headerTitleColor: 'text-white',
    glowColor: 'rgba(52, 211, 153, 0.4)',
    previewBg: 'bg-emerald-800',
  },
  amber: {
    id: 'amber',
    name: 'Or & Prestige Supermarché',
    description: 'Design premium chaleureux idéal pour les remises de lots',
    bgColor: '#451a03',
    bgGradient: 'from-amber-950 via-stone-900 to-yellow-950',
    accentColor: '#f59e0b',
    cardBg: 'bg-amber-950/40 backdrop-blur-md',
    cardBorder: 'border-amber-500/30',
    scoreColor: 'text-amber-300',
    nameColor: 'text-amber-100',
    headerTitleColor: 'text-amber-200',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    previewBg: 'bg-amber-900',
  },
  crimson: {
    id: 'crimson',
    name: 'Rouge Énergie & Promo',
    description: 'Très dynamique et visible au loin dans les allées marchandes',
    bgColor: '#881337',
    bgGradient: 'from-rose-950 via-red-900 to-pink-950',
    accentColor: '#fb7185',
    cardBg: 'bg-rose-900/30 backdrop-blur-md',
    cardBorder: 'border-rose-500/30',
    scoreColor: 'text-rose-200',
    nameColor: 'text-rose-100',
    headerTitleColor: 'text-white',
    glowColor: 'rgba(251, 113, 133, 0.4)',
    previewBg: 'bg-rose-800',
  },
  dark: {
    id: 'dark',
    name: 'Noir Néon Moderne',
    description: 'Fond sombre haute lisibilité avec contrastes marqués',
    bgColor: '#090d16',
    bgGradient: 'from-slate-950 via-zinc-900 to-black',
    accentColor: '#a855f7',
    cardBg: 'bg-zinc-900/60 backdrop-blur-md',
    cardBorder: 'border-zinc-700/50',
    scoreColor: 'text-purple-400',
    nameColor: 'text-zinc-100',
    headerTitleColor: 'text-white',
    glowColor: 'rgba(168, 85, 247, 0.4)',
    previewBg: 'bg-zinc-900',
  },
};
