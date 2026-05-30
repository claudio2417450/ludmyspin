import { useState } from 'react';
import { Dashboard }      from './Dashboard.tsx';
import { PlayerList }     from './PlayerList.tsx';
import { WithdrawalList } from './WithdrawalList.tsx';
import { AdminWallet }    from './AdminWallet.tsx';
import { AdminList }      from './AdminList.tsx';

type Tab = 'dashboard' | 'players' | 'withdrawals' | 'wallet' | 'admins';

interface Props {
  role:      'admin' | 'owner';
  username:  string;
  onLogout:  () => void;
  onPlayGame: () => void;
}

export function AdminApp({ role, username, onLogout, onPlayGame }: Props) {
  const [tab, setTab] = useState<Tab>('dashboard');

  const tabs: { id: Tab; label: string; icon: string; ownerOnly?: boolean }[] = [
    { id: 'dashboard',   label: 'Dashboard',  icon: '📊' },
    { id: 'players',     label: 'Jugadores',  icon: '👥' },
    { id: 'withdrawals', label: 'Retiros',    icon: '💸' },
    { id: 'wallet',      label: 'Mi bolsa',   icon: '🏦' },
    { id: 'admins',      label: 'Admins',     icon: '🛡️', ownerOnly: true },
  ];

  const visibleTabs = tabs.filter((t) => !t.ownerOnly || role === 'owner');

  return (
    <div className="admin-screen">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header__left">
          <span className="admin-header__logo">🎰 LuDmySpin</span>
          <span className="admin-header__badge">Panel Admin</span>
        </div>
        <div className="admin-header__right">
          <span className="admin-header__role">{role === 'owner' ? '👑' : '🛡️'} {username}</span>
          <button className="btn-outline" onClick={onPlayGame}>Jugar</button>
          <button className="btn-outline btn-outline--dim" onClick={onLogout}>Salir</button>
        </div>
      </header>

      {/* Nav tabs */}
      <nav className="admin-nav">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            className={`admin-nav__tab${tab === t.id ? ' admin-nav__tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="admin-nav__icon">{t.icon}</span>
            <span className="admin-nav__label">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="admin-content">
        {tab === 'dashboard'   && <Dashboard role={role} />}
        {tab === 'players'     && <PlayerList />}
        {tab === 'withdrawals' && <WithdrawalList />}
        {tab === 'wallet'      && <AdminWallet role={role} />}
        {tab === 'admins'      && role === 'owner' && <AdminList />}
      </main>
    </div>
  );
}
