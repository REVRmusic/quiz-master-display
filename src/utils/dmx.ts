import { DmxColor, DmxConfig, DmxPlayerMapping, Player } from '../types';
import { DEFAULT_DMX_CONFIG } from '../constants/defaultData';

/**
 * Determine the PAR LED color for a player based on the organizer's lighting rules:
 * - Eliminated -> Red ('red')
 * - Answering / Buzzed in first -> Yellow ('yellow')
 * - Has scored / Winner -> Blue ('blue')
 * - Default (active, 0 pts) -> Green ('green')
 */
export function getPlayerDmxColor(
  player: Player,
  winScore: number,
  answeringPlayerId?: string | null
): DmxColor {
  if (player.status === 'eliminated') {
    return 'red';
  }
  if (answeringPlayerId && player.id === answeringPlayerId) {
    return 'yellow';
  }
  if (player.score > 0 || player.status === 'winner' || (winScore > 0 && player.score >= winScore)) {
    return 'blue';
  }
  return 'green';
}

export function getDmxColorMeta(color: DmxColor): {
  label: string;
  description: string;
  dotClass: string;
  pillClass: string;
  glowStyle: string;
} {
  switch (color) {
    case 'yellow':
      return {
        label: 'JAUNE',
        description: 'En réponse (Buzz)',
        dotClass: 'bg-amber-300 shadow-[0_0_12px_#fde047] animate-pulse',
        pillClass: 'bg-amber-950/80 text-amber-300 border-amber-500 shadow-[0_0_14px_rgba(251,191,36,0.6)] animate-pulse',
        glowStyle: '0 0 35px rgba(250, 204, 21, 0.9)',
      };
    case 'blue':
      return {
        label: 'BLEU',
        description: 'Point marqué',
        dotClass: 'bg-sky-400 shadow-[0_0_10px_#38bdf8]',
        pillClass: 'bg-sky-950/70 text-sky-300 border-sky-600/60',
        glowStyle: '0 0 28px rgba(56, 189, 248, 0.75)',
      };
    case 'red':
      return {
        label: 'ROUGE',
        description: 'Éliminé',
        dotClass: 'bg-rose-500 shadow-[0_0_10px_#f43f5e]',
        pillClass: 'bg-rose-950/70 text-rose-300 border-rose-600/60',
        glowStyle: '0 0 28px rgba(244, 63, 94, 0.75)',
      };
    case 'green':
    default:
      return {
        label: 'VERT',
        description: 'Par défaut (0 pt)',
        dotClass: 'bg-emerald-400 shadow-[0_0_10px_#34d399]',
        pillClass: 'bg-emerald-950/70 text-emerald-300 border-emerald-600/60',
        glowStyle: '0 0 28px rgba(52, 211, 153, 0.75)',
      };
  }
}

export function resolveDmxConfig(dmxConfig?: DmxConfig): DmxConfig {
  if (!dmxConfig) return DEFAULT_DMX_CONFIG;

  const sanitizeMapping = (m: Partial<DmxPlayerMapping> | undefined, def: DmxPlayerMapping): DmxPlayerMapping => {
    return {
      green: m?.green || def.green,
      blue: m?.blue || def.blue,
      yellow: m?.yellow || def.yellow,
      red: m?.red || def.red,
    };
  };

  const mappings: DmxPlayerMapping[] = [];
  for (let i = 0; i < 6; i++) {
    const def = DEFAULT_DMX_CONFIG.playerMappings[i];
    const cur = dmxConfig.playerMappings?.[i];
    mappings.push(sanitizeMapping(cur, def));
  }

  return {
    ...DEFAULT_DMX_CONFIG,
    ...dmxConfig,
    playerMappings: mappings,
  };
}
