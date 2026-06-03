import { useState, useEffect } from 'react';
import { api } from '../api/client.ts';
import type { SlotInfo } from '../api/client.ts';

// Juegos "próximamente" — aún no implementados
const COMING_SOON = [
  { id: 'crash',   name: 'Crash',   icon: '🚀', color: '#7f1d1d', desc: 'Retirá antes del crash' },
  { id: 'mines',   name: 'Mines',   icon: '💣', color: '#14532d', desc: 'Evitá las minas' },
  { id: 'dice',    name: 'Dice',    icon: '🎲', color: '#1e3a8a', desc: 'Apostá al resultado' },
  { id: 'roulette',name: 'Ruleta', icon: '🎡', color: '#5b21b6', desc: 'Rojo, negro o número' },
];

// Precios de apuesta mínima formateados
function fmtBet(n: number) { return n.toLocaleString('es'); }

// Icono por slot
const SLOT_ICONS: Record<string, string> = {
  classic: '🍒', fruits: '🍋', bonanza: '⭐', harvest: '🌾', worldcup: '🏆',
};

interface Props {
  balance:       number;
  username:      string;
  onSelectSlot:  (slotId: string) => void;
  onLogout:      () => void;
  onAdminPanel?: () => void;
}

export function Lobby({ balance, username, onSelectSlot, onLogout, onAdminPanel }: Props) {
  const [slots, setSlots]     = useState<SlotInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSlots()
      .then(r => setSlots(r.slots))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="lobby-screen">

      {/* Header */}
      <header className="lobby-header">
        <div className="lobby-header__brand">
          <span className="lobby-header__logo">🎰</span>
          <span className="lobby-header__title">LuDmySpin</span>
        </div>
        <div className="lobby-header__right">
          <div className="lobby-header__balance">
            <span className="lobby-header__balance-label">CRÉDITOS</span>
            <span className="lobby-header__balance-amount">{balance.toLocaleString('es')}</span>
          </div>
          <span className="lobby-header__user">👤 {username}</span>
          {onAdminPanel && (
            <button className="lobby-btn-sm" onClick={onAdminPanel}>Admin</button>
          )}
          <button className="lobby-btn-sm" onClick={onLogout}>Salir</button>
        </div>
      </header>

      {/* Contenido */}
      <main className="lobby-content">

        {/* Slots disponibles */}
        <section className="lobby-section">
          <h2 className="lobby-section-title">
            <span className="lobby-section-icon">🎰</span> Slots
          </h2>

          {loading ? (
            <p className="lobby-loading">Cargando juegos…</p>
          ) : (
            <div className="lobby-grid">
              {slots.map(slot => (
                <button
                  key={slot.id}
                  className="game-card game-card--active"
                  onClick={() => onSelectSlot(slot.id)}
                >
                  <div className="game-card__icon">
                    {SLOT_ICONS[slot.id] ?? '🎰'}
                  </div>
                  <div className="game-card__info">
                    <span className="game-card__name">{slot.name}</span>
                    <div className="game-card__tags">
                      <span className="game-card__tag">{slot.paylines.length} línea{slot.paylines.length > 1 ? 's' : ''}</span>
                      <span className="game-card__tag">Min {fmtBet(slot.minBet)}</span>
                    </div>
                  </div>
                  <span className="game-card__play">JUGAR →</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Próximamente */}
        <section className="lobby-section">
          <h2 className="lobby-section-title">
            <span className="lobby-section-icon">🔒</span> Próximamente
          </h2>
          <div className="lobby-grid">
            {COMING_SOON.map(g => (
              <div
                key={g.id}
                className="game-card game-card--soon"
                style={{ '--card-color': g.color } as React.CSSProperties}
              >
                <div className="game-card__icon">{g.icon}</div>
                <div className="game-card__info">
                  <span className="game-card__name">{g.name}</span>
                  <span className="game-card__desc">{g.desc}</span>
                </div>
                <span className="game-card__soon-badge">PRONTO</span>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
