const ACTIVE_THEME = 'placeholder';

/** Cada símbolo del motor tiene un emoji y un color de fondo para el tema placeholder. */
export const SYMBOL_META: Record<string, { emoji: string; bg: string; label: string }> = {
  cherry:  { emoji: '🍒', bg: '#3d1010', label: 'Cherry'  },
  lemon:   { emoji: '🍋', bg: '#3d3510', label: 'Lemon'   },
  orange:  { emoji: '🍊', bg: '#3d2010', label: 'Orange'  },
  seven:   { emoji: '7',  bg: '#1a103d', label: 'Seven'   },
  plum:    { emoji: '🍇', bg: '#27103d', label: 'Plum'    },
  bell:    { emoji: '🔔', bg: '#3d2c10', label: 'Bell'    },
  wild:    { emoji: '⭐', bg: '#103d20', label: 'Wild'    },
  scatter: { emoji: '💫', bg: '#2d1038', label: 'Scatter' },
};

export const theme = {
  active: ACTIVE_THEME,
  base: `/themes/${ACTIVE_THEME}`,
  symbols: {
    cherry: 'symbols/cherry.png',
    lemon:  'symbols/lemon.png',
    orange: 'symbols/orange.png',
    seven:  'symbols/seven.png',
    plum:   'symbols/plum.png',
    bell:   'symbols/bell.png',
  },
  sfx: {
    spin: 'sfx/spin.mp3',
    win:  'sfx/win.mp3',
  },
};

/** Todos los nombres lógicos de símbolos registrados. */
export const ALL_SYMBOLS = Object.keys(SYMBOL_META);
