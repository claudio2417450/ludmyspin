import { useState } from 'react';
import { useAuth } from './hooks/useAuth.ts';
import { Login }          from './pages/Login.tsx';
import { ChangePassword } from './pages/ChangePassword.tsx';
import { Lobby }          from './pages/Lobby.tsx';
import { Game }           from './pages/Game.tsx';
import { AdminApp }       from './admin/AdminApp.tsx';

type View = 'lobby' | 'game' | 'admin';

export default function App() {
  const { auth, login, logout, afterPasswordChange, updateBalance } = useAuth();
  const [view, setView]           = useState<View>('lobby');
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);

  if (!auth.token) return <Login onLogin={login} />;
  if (auth.mustChangePassword) return <ChangePassword onDone={afterPasswordChange} />;

  const isStaff = auth.role === 'admin' || auth.role === 'owner';
  const uname   = localStorage.getItem('username') ?? auth.role ?? 'jugador';

  if (isStaff && view === 'admin') {
    return (
      <AdminApp
        role={auth.role as 'admin' | 'owner'}
        username={uname}
        onLogout={logout}
        onPlayGame={() => setView('lobby')}
      />
    );
  }

  if (view === 'game' && activeSlotId) {
    return (
      <Game
        initialSlotId={activeSlotId}
        balance={auth.balance}
        username={uname}
        onBalance={updateBalance}
        onLogout={logout}
        onLobby={() => setView('lobby')}
        onAdminPanel={isStaff ? () => setView('admin') : undefined}
      />
    );
  }

  // Lobby por defecto
  return (
    <Lobby
      balance={auth.balance}
      username={uname}
      onSelectSlot={(slotId) => { setActiveSlotId(slotId); setView('game'); }}
      onLogout={logout}
      onAdminPanel={isStaff ? () => setView('admin') : undefined}
    />
  );
}
