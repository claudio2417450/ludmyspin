import { useState } from 'react';
import { useAuth } from './hooks/useAuth.ts';
import { Login }          from './pages/Login.tsx';
import { ChangePassword } from './pages/ChangePassword.tsx';
import { Game }           from './pages/Game.tsx';
import { AdminApp }       from './admin/AdminApp.tsx';

type View = 'game' | 'admin';

export default function App() {
  const { auth, login, logout, afterPasswordChange, updateBalance } = useAuth();
  const [view, setView] = useState<View>('game');

  if (!auth.token) {
    return <Login onLogin={login} />;
  }

  if (auth.mustChangePassword) {
    return <ChangePassword onDone={afterPasswordChange} />;
  }

  const isStaff = auth.role === 'admin' || auth.role === 'owner';

  // Staff que eligió ver el panel
  if (isStaff && view === 'admin') {
    return (
      <AdminApp
        role={auth.role as 'admin' | 'owner'}
        username={localStorage.getItem('username') ?? auth.role ?? 'admin'}
        onLogout={logout}
        onPlayGame={() => setView('game')}
      />
    );
  }

  return (
    <Game
      balance={auth.balance}
      username={localStorage.getItem('username') ?? 'jugador'}
      onBalance={updateBalance}
      onLogout={logout}
      onAdminPanel={isStaff ? () => setView('admin') : undefined}
    />
  );
}
