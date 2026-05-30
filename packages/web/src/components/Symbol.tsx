import { SYMBOL_META } from '../themes/manifest.ts';

interface Props {
  name:        string;
  size?:       number;
  highlighted?: boolean;
  dimmed?:     boolean;
}

export function Symbol({ name, size = 80, highlighted = false, dimmed = false }: Props) {
  const meta = SYMBOL_META[name] ?? { emoji: '?', bg: '#222', label: name };

  return (
    <div
      className={`symbol${highlighted ? ' symbol--win' : ''}${dimmed ? ' symbol--dim' : ''}`}
      style={{
        width:      size,
        height:     size,
        background: meta.bg,
      }}
      aria-label={meta.label}
    >
      <span className="symbol__emoji">{meta.emoji}</span>
    </div>
  );
}
