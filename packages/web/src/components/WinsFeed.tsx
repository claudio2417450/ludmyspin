import { useWinsFeed } from '../hooks/useWinsFeed.ts';

const SYMBOL_EMOJI: Record<string, string> = {
  cherry: '🍒', lemon: '🍋', orange: '🍊', seven: '7️⃣', plum: '🍇', bell: '🔔',
};

export function WinsFeed() {
  const wins = useWinsFeed();

  if (wins.length === 0) return null;

  return (
    <aside className="wins-feed" aria-label="Premios en tiempo real">
      <div className="wins-feed__title">🔴 En vivo</div>
      <ul className="wins-feed__list">
        {wins.map((w) => (
          <li key={w.id} className="wins-feed__item">
            <span className="wins-feed__symbol">{SYMBOL_EMOJI[w.symbol] ?? '🎰'}</span>
            <span className="wins-feed__text">
              <strong>{w.username}</strong> ganó{' '}
              <span className="wins-feed__amount">+{w.payout.toLocaleString('es')}</span>
              {' '}en {w.slotName}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
