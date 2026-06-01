import { useState, useEffect } from 'react';
import { SYMBOL_META, theme } from '../themes/manifest.ts';

interface Props {
  name:         string;
  size?:        number;
  highlighted?: boolean;
  dimmed?:      boolean;
}

// Caché global: guarda la extensión que funciona para cada símbolo
// Así no repite intentos fallidos en cada re-render
const extCache = new Map<string, string | null>();
const EXTS = ['webp', 'png', 'jpg', 'svg'];

function cachedSrc(name: string): string | null {
  if (extCache.has(name)) return extCache.get(name) ?? null;
  return undefined as unknown as null; // no cacheado todavía
}

export function Symbol({ name, size = 80, highlighted = false, dimmed = false }: Props) {
  const meta        = SYMBOL_META[name] ?? { emoji: '?', bg: '#222', label: name };
  const isPlaceholder = theme.active === 'placeholder';

  // Estado local: null = emoji, string = URL de imagen
  const [src, setSrc] = useState<string | null>(() => {
    if (isPlaceholder) return null;
    const cached = cachedSrc(name);
    if (cached !== (undefined as unknown as null)) return cached;
    // Primer intento: primera extensión
    return `${theme.base}/symbols/${name}.${EXTS[0]}`;
  });

  // Cuando cambia el nombre del símbolo, buscar en caché o reintentar
  useEffect(() => {
    if (isPlaceholder) { setSrc(null); return; }
    if (extCache.has(name)) {
      setSrc(extCache.get(name) ?? null);
    } else {
      setSrc(`${theme.base}/symbols/${name}.${EXTS[0]}`);
    }
  }, [name, isPlaceholder]);

  const handleError = () => {
    if (!src) return;
    // Determinar qué extensión falló y probar la siguiente
    const failedExt = src.split('.').pop() ?? '';
    const idx       = EXTS.indexOf(failedExt);
    const nextIdx   = idx + 1;
    if (nextIdx < EXTS.length) {
      setSrc(`${theme.base}/symbols/${name}.${EXTS[nextIdx]}`);
    } else {
      // Todas las extensiones fallaron → emoji
      extCache.set(name, null);
      setSrc(null);
    }
  };

  const handleLoad = () => {
    // Cachear la extensión que funcionó
    if (src) extCache.set(name, src);
  };

  const classes = [
    'symbol',
    highlighted ? 'symbol--win' : '',
    dimmed      ? 'symbol--dim' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      style={{ width: size, height: size, background: src ? 'transparent' : meta.bg }}
      aria-label={meta.label}
    >
      {src ? (
        <img
          key={src}
          src={src}
          alt={meta.label}
          onLoad={handleLoad}
          onError={handleError}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      ) : (
        <span className="symbol__emoji">{meta.emoji}</span>
      )}
    </div>
  );
}
