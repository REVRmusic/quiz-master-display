import { DmxColor, DmxConfig, Player } from '../types';
import { DEFAULT_DMX_CONFIG } from '../constants/defaultData';

/**
 * Determine the PAR LED color for a player based on the organizer's lighting rules:
 * - Eliminated -> Red ('red')
 * - Winner / reached winScore -> Green ('green')
 * - Active (0, 1, or 2 points) -> Blue ('blue')
 */
export function getPlayerDmxColor(player: Player, winScore: number): DmxColor {
  if (player.status === 'eliminated') {
    return 'red';
  }
  if (player.status === 'winner' || (winScore > 0 && player.score >= winScore)) {
    return 'green';
  }
  return 'blue';
}

export function getDmxColorMeta(color: DmxColor): {
  label: string;
  dotClass: string;
  pillClass: string;
  glowStyle: string;
} {
  switch (color) {
    case 'green':
      return {
        label: 'VERT',
        dotClass: 'bg-emerald-400 shadow-[0_0_10px_#34d399]',
        pillClass: 'bg-emerald-950/70 text-emerald-300 border-emerald-600/60',
        glowStyle: '0 0 28px rgba(52, 211, 153, 0.75)',
      };
    case 'red':
      return {
        label: 'ROUGE',
        dotClass: 'bg-rose-500 shadow-[0_0_10px_#f43f5e]',
        pillClass: 'bg-rose-950/70 text-rose-300 border-rose-600/60',
        glowStyle: '0 0 28px rgba(244, 63, 94, 0.75)',
      };
    case 'blue':
    default:
      return {
        label: 'BLEU',
        dotClass: 'bg-sky-400 shadow-[0_0_10px_#38bdf8]',
        pillClass: 'bg-sky-950/70 text-sky-300 border-sky-600/60',
        glowStyle: '0 0 28px rgba(56, 189, 248, 0.75)',
      };
  }
}

export function resolveDmxConfig(dmxConfig?: DmxConfig): DmxConfig {
  if (!dmxConfig) return DEFAULT_DMX_CONFIG;
  return {
    ...DEFAULT_DMX_CONFIG,
    ...dmxConfig,
    playerMappings:
      dmxConfig.playerMappings && dmxConfig.playerMappings.length >= 6
        ? dmxConfig.playerMappings
        : DEFAULT_DMX_CONFIG.playerMappings.map((def, idx) => dmxConfig.playerMappings?.[idx] || def),
  };
}
