import { useState } from 'react';
import { SYMBOL_META, theme } from '../themes/manifest.ts';
import { FOOTBALL_META, SHEET, SHEET_W, SHEET_H, SPRITE_W, SPRITE_H, isFootballSymbol } from '../themes/football.ts';

interface Props {
  name:         string;
  size?:        number;
  highlighted?: boolean;
  dimmed?:      boolean;
}

// Caché global: extensión que funciona para cada símbolo de frutas
const extCache = new Map<string, string | null>();
const EXTS = ['webp', 'png', 'jpg', 'svg'];

export function Symbol({ name, size = 80, highlighted = false, dimmed = false }: Props) {
  const classes = [
    'symbol',
    highlighted ? 'symbol--win'  : '',
    dimmed      ? 'symbol--dim'  : '',
  ].filter(Boolean).join(' ');

  // ── Símbolo de fútbol → spritesheet ──────────────────────────────────────
  if (isFootballSymbol(name)) {
    return (
      <FootballSymbol
        name={name}
        size={size}
        classes={classes}
      />
    );
  }

  // ── Símbolo normal (frutas, etc.) → imagen del tema o emoji ──────────────
  return (
    <FruitSymbol name={name} size={size} classes={classes} />
  );
}

// ── Renderiza un sprite del atlas de fútbol ───────────────────────────────
function FootballSymbol({ name, size, classes }: { name: string; size: number; classes: string }) {
  const meta = FOOTBALL_META[name];
  const [loaded, setLoaded] = useState(false);

  // Escalar el atlas para que el sprite encaje en el símbolo (ancho = size)
  const scale    = size / SPRITE_W;
  const imgW     = SHEET_W * scale;
  const imgH     = SHEET_H * scale;
  const offsetX  = meta.x * scale;
  const offsetY  = meta.y * scale;
  const spriteH  = SPRITE_H * scale;  // alto del sprite escalado

  return (
    <div
      className={classes}
      style={{
        width: size,
        height: spriteH,     // más alto que ancho → retrato del jugador
        background: loaded ? 'transparent' : meta.bg,
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
      }}
      aria-label={meta.label}
    >
      <img
        src={SHEET}
        alt={meta.label}
        onLoad={() => setLoaded(true)}
        style={{
          position:  'absolute',
          width:     imgW,
          height:    imgH,
          left:      -offsetX,
          top:       -offsetY,
          imageRendering: 'auto',
        }}
      />
      {!loaded && (
        <span
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size * 0.4,
          }}
        >
          {meta.emoji}
        </span>
      )}
    </div>
  );
}

// ── Renderiza un símbolo de frutas del tema activo ────────────────────────
function FruitSymbol({ name, size, classes }: { name: string; size: number; classes: string }) {
  const meta        = SYMBOL_META[name] ?? { emoji: '?', bg: '#222', label: name };
  const isPlaceholder = theme.active === 'placeholder';

  const [extIdx, setExtIdx] = useState(isPlaceholder ? -1 : 0);

  const handleError = () => {
    const failedExt = src?.split('.').pop() ?? '';
    const idx       = EXTS.indexOf(failedExt);
    const next      = idx + 1;
    if (next < EXTS.length) {
      setExtIdx(next);
    } else {
      extCache.set(name, null);
      setExtIdx(-1);
    }
  };

  const handleLoad = () => { if (src) extCache.set(name, src); };

  const showEmoji = isPlaceholder || extIdx < 0;
  const src       = !showEmoji ? `${theme.base}/symbols/${name}.${EXTS[extIdx]}` : '';

  return (
    <div
      className={classes}
      style={{ width: size, height: size, background: showEmoji ? meta.bg : 'transparent' }}
      aria-label={meta.label}
    >
      {!showEmoji && (
        <img
          key={src}
          src={src}
          alt={meta.label}
          onLoad={handleLoad}
          onError={handleError}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      )}
      {showEmoji && (
        <span className="symbol__emoji">{meta.emoji}</span>
      )}
    </div>
  );
}
