import { DmxColor, DmxConfig, DmxPlayerMapping, Player } from '../types';
import { DEFAULT_DMX_CONFIG } from '../constants/defaultData';

/**
 * Determine the PAR LED color for a player based on the companion app rules:
 * - Eliminated -> Red ('red') (until new round)
 * - Reached 3 points (or winScore) / Winner -> Yellow ('yellow') (until new round)
 * - Answering / Buzzed in first (has the floor) -> Blue ('blue')
 * - Default / Waiting position (0, 1, 2 pts, active) -> Green ('green')
 */
export function getPlayerDmxColor(
  player: Player,
  winScore: number,
  answeringPlayerId?: string | null
): DmxColor {
  if (player.status === 'eliminated') {
    return 'red';
  }
  const targetScore = winScore > 0 ? winScore : 3;
  if (player.score >= targetScore || player.status === 'winner') {
    return 'yellow';
  }
  if (answeringPlayerId && player.id === answeringPlayerId) {
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
        description: '3 points (Qualifié)',
        dotClass: 'bg-amber-300 shadow-[0_0_12px_#fde047]',
        pillClass: 'bg-amber-950/80 text-amber-300 border-amber-500 shadow-[0_0_14px_rgba(251,191,36,0.6)]',
        glowStyle: '0 0 35px rgba(250, 204, 21, 0.9)',
      };
    case 'blue':
      return {
        label: 'BLEU',
        description: 'A la main (Buzz)',
        dotClass: 'bg-sky-400 shadow-[0_0_12px_#38bdf8] animate-pulse',
        pillClass: 'bg-sky-950/80 text-sky-300 border-sky-500 shadow-[0_0_14px_rgba(56,189,248,0.6)] animate-pulse',
        glowStyle: '0 0 35px rgba(56, 189, 248, 0.9)',
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
        description: 'Position d\'attente',
        dotClass: 'bg-emerald-400 shadow-[0_0_10px_#34d399]',
        pillClass: 'bg-emerald-950/70 text-emerald-300 border-emerald-600/60',
        glowStyle: '0 0 28px rgba(52, 211, 153, 0.75)',
      };
  }
}

export function resolveDmxConfig(dmxConfig?: DmxConfig): DmxConfig {
  if (!dmxConfig) return DEFAULT_DMX_CONFIG;

  const sanitizeMapping = (m: Partial<DmxPlayerMapping> | undefined, def: DmxPlayerMapping, idx: number): DmxPlayerMapping => {
    // For the 4 active quiz players, strictly enforce the official key matrix (Z/W/A/E, T/U/R/Y, S/X/Q/D, G/V/F/H)
    if (idx < 4) {
      const isOutdated =
        !m ||
        m.green !== def.green ||
        m.blue !== def.blue ||
        m.yellow !== def.yellow ||
        m.red !== def.red;

      if (isOutdated) {
        return { ...def };
      }
    }

    return {
      green: (m?.green && m.green.trim().toUpperCase()) || def.green,
      blue: (m?.blue && m.blue.trim().toUpperCase()) || def.blue,
      yellow: (m?.yellow && m.yellow.trim().toUpperCase()) || def.yellow,
      red: (m?.red && m.red.trim().toUpperCase()) || def.red,
    };
  };

  const mappings: DmxPlayerMapping[] = [];
  for (let i = 0; i < 6; i++) {
    const def = DEFAULT_DMX_CONFIG.playerMappings[i];
    const cur = dmxConfig.playerMappings?.[i];
    mappings.push(sanitizeMapping(cur, def, i));
  }

  return {
    ...DEFAULT_DMX_CONFIG,
    ...dmxConfig,
    playerMappings: mappings,
  };
}
