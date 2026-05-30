interface Props {
  freeSpinsLeft:  number;
  freeSpinsGiven: number;
}

export function FreeSpinsCounter({ freeSpinsLeft, freeSpinsGiven }: Props) {
  if (freeSpinsLeft === 0 && freeSpinsGiven === 0) return null;

  if (freeSpinsGiven > 0 && freeSpinsLeft >= freeSpinsGiven) {
    // Acaba de dispararse — mostrar notificación de bienvenida
    return (
      <div className="freespins-triggered">
        <span className="freespins-triggered__icon">🌟</span>
        <span>¡{freeSpinsGiven} GIROS GRATIS!</span>
      </div>
    );
  }

  if (freeSpinsLeft > 0) {
    return (
      <div className="freespins-counter">
        <span className="freespins-counter__label">GIROS GRATIS</span>
        <span className="freespins-counter__value">{freeSpinsLeft}</span>
        <span className="freespins-counter__sub">restantes · ¡Gratis!</span>
      </div>
    );
  }

  return null;
}
