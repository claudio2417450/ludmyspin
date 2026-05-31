import { useState } from 'react';
import { SYMBOL_META, theme } from '../themes/manifest.ts';

interface Props {
  name:         string;
  size?:        number;
  highlighted?: boolean;
  dimmed?:      boolean;
}

export function Symbol({ name, size = 80, highlighted = false, dimmed = false }: Props) {
  const meta      = SYMBOL_META[name] ?? { emoji: '?', bg: '#222', label: name };
  const [useImg, setUseImg] = useState(theme.active !== 'placeholder');

  // Ruta de imagen del tema activo
  const imgSrc = `${theme.base}/symbols/${name}.png`;

  const classes = [
    'symbol',
    highlighted ? 'symbol--win' : '',
    dimmed      ? 'symbol--dim' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      style={{ width: size, height: size, background: useImg ? 'transparent' : meta.bg }}
      aria-label={meta.label}
    >
      {useImg ? (
        <img
          src={imgSrc}
          alt={meta.label}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onError={() => setUseImg(false)}   // fallback al emoji si no existe la imagen
        />
      ) : (
        <span className="symbol__emoji">{meta.emoji}</span>
      )}
    </div>
  );
}
