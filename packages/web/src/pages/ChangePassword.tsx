import { useState, type FormEvent } from 'react';
import { api } from '../api/client.ts';

interface Props {
  onDone: (newToken: string) => void;
}

export function ChangePassword({ onDone }: Props) {
  const [current, setCurrent] = useState('');
  const [next, setNext]       = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (next !== confirm) { setError('Las contraseñas no coinciden'); return; }
    if (next.length < 8)  { setError('Mínimo 8 caracteres'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await api.changePassword({ currentPassword: current, newPassword: next });
      onDone(res.token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-title">🔐 Cambiar contraseña</h1>
        <p className="auth-subtitle">Es obligatorio en el primer inicio de sesión.</p>

        <form onSubmit={submit} className="auth-form">
          <label className="auth-label">
            Contraseña actual
            <input
              className="auth-input" type="password"
              value={current} onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password" required
            />
          </label>
          <label className="auth-label">
            Nueva contraseña
            <input
              className="auth-input" type="password"
              value={next} onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password" minLength={8} required
            />
          </label>
          <label className="auth-label">
            Confirmar contraseña
            <input
              className="auth-input" type="password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password" required
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
