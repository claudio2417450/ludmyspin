/**
 * Símbolos del slot World Cup 2026.
 * Los sprites vienen del atlas: /themes/futbol/atlas_jugadores.webp
 * Para activar: poné el atlas en packages/web/public/themes/futbol/
 *
 * Dimensiones del atlas: 1280 × 1960 px | sprite: 160 × 280 px
 */

export interface FootballSprite {
  x: number;    // posición X en el atlas
  y: number;    // posición Y en el atlas
  label: string;
  emoji: string;
  bg: string;
}

const SHEET = '/themes/mi-tema/symbols/futbol/atlas_jugadores.webp';
export const SHEET_W = 1280;
export const SHEET_H = 1960;
export const SPRITE_W = 160;
export const SPRITE_H = 280;

/** Símbolos usados en el slot worldcup con su posición en el atlas */
export const FOOTBALL_META: Record<string, FootballSprite> = {
  'brasil neymar':    { x: 1120, y:    0, label: 'Neymar',   emoji: '🇧🇷', bg: '#003d1f' },
  'alemania musiala': { x:    0, y:    0, label: 'Musiala',  emoji: '🇩🇪', bg: '#1a1a1a' },
  'marruecos Hakimi': { x:  800, y:  840, label: 'Hakimi',   emoji: '🇲🇦', bg: '#3d1010' },
  'noruega Haaland':  { x:    0, y: 1120, label: 'Haaland',  emoji: '🇳🇴', bg: '#3d1010' },
  'argentina messi':  { x:  480, y:    0, label: 'Messi',    emoji: '🇦🇷', bg: '#1a3a6a' },
  'copa2026':         { x:  480, y:  280, label: 'Copa Wild', emoji: '🏆', bg: '#2d2800' },
};

/** Verdadero si este símbolo pertenece al slot de fútbol */
export function isFootballSymbol(name: string): name is keyof typeof FOOTBALL_META {
  return name in FOOTBALL_META;
}

export { SHEET };
