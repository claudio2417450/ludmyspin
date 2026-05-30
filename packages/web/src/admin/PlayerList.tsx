import { useState, useEffect, type FormEvent } from 'react';
import { adminApi } from '../api/admin.ts';
import type { Player } from '../api/admin.ts';
import { Modal } from './Modal.tsx';

export function PlayerList() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Modales
  const [showCreate, setShowCreate]         = useState(false);
  const [creditTarget, setCreditTarget]     = useState<Player | null>(null);
  const [banTarget, setBanTarget]           = useState<Player | null>(null);

  const refresh = () => {
    setLoading(true);
    adminApi.getPlayers()
      .then((r) => setPlayers(r.players))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  if (loading) return <div className="admin-loading">Cargando jugadores…</div>;

  return (
    <div>
      <div className="admin-section-header">
        <h2 className="admin-section-title">Jugadores</h2>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>+ Nuevo jugador</button>
      </div>

      {error && <p className="admin-error">{error}</p>}

      {players.length === 0
        ? <p className="text-dim">No hay jugadores aún.</p>
        : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Usuario</th><th>Estado</th><th>Creado</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id}>
                    <td className="td-username">👤 {p.username}</td>
                    <td>
                      <span className={`badge badge--${p.status === 'active' ? 'green' : 'red'}`}>
                        {p.status === 'active' ? 'Activo' : 'Suspendido'}
                      </span>
                    </td>
                    <td className="td-date">{new Date(p.createdAt).toLocaleDateString('es')}</td>
                    <td className="td-actions">
                      <button className="btn-sm btn-sm--blue"   onClick={() => setCreditTarget(p)}>Cargar</button>
                      <button
                        className={`btn-sm ${p.status === 'active' ? 'btn-sm--red' : 'btn-sm--green'}`}
                        onClick={() => setBanTarget(p)}
                      >
                        {p.status === 'active' ? 'Suspender' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      {showCreate && (
        <CreatePlayerModal
          onClose={() => setShowCreate(false)}
          onCreated={refresh}
        />
      )}

      {creditTarget && (
        <LoadCreditModal
          player={creditTarget}
          onClose={() => setCreditTarget(null)}
          onDone={refresh}
        />
      )}

      {banTarget && (
        <BanModal
          player={banTarget}
          onClose={() => setBanTarget(null)}
          onDone={refresh}
        />
      )}
    </div>
  );
}

// ── Modales ───────────────────────────────────────────────────────────────────

function CreatePlayerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await adminApi.createPlayer({ username, password });
      onCreated(); onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally { setLoading(false); }
  };

  return (
    <Modal title="Nuevo jugador" onClose={onClose}>
      <form onSubmit={submit} className="modal-form">
        <label className="auth-label">Usuario
          <input className="auth-input" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label className="auth-label">Contraseña temporal
          <input className="auth-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        </label>
        {error && <p className="admin-error">{error}</p>}
        <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Creando…' : 'Crear jugador'}</button>
      </form>
    </Modal>
  );
}

function LoadCreditModal({ player, onClose, onDone }: { player: Player; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(1000);
  const [note, setNote]     = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await adminApi.loadCredit(player.id, { amount, note: note || undefined });
      onDone(); onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally { setLoading(false); }
  };

  return (
    <Modal title={`Cargar créditos → ${player.username}`} onClose={onClose}>
      <form onSubmit={submit} className="modal-form">
        <label className="auth-label">Monto
          <input className="auth-input" type="number" min={1} value={amount}
            onChange={(e) => setAmount(Number(e.target.value))} required />
        </label>
        <label className="auth-label">Nota (opcional)
          <input className="auth-input" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {error && <p className="admin-error">{error}</p>}
        <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Cargando…' : `Cargar ${amount.toLocaleString('es')} créditos`}</button>
      </form>
    </Modal>
  );
}

function BanModal({ player, onClose, onDone }: { player: Player; onClose: () => void; onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const action = player.status === 'active' ? 'banned' : 'active';

  const confirm = async () => {
    setLoading(true);
    try {
      await adminApi.updatePlayer(player.id, { status: action });
      onDone(); onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally { setLoading(false); }
  };

  return (
    <Modal title={action === 'banned' ? `Suspender a ${player.username}` : `Activar a ${player.username}`} onClose={onClose}>
      <p style={{ marginBottom: '1rem', color: 'var(--text-dim)' }}>
        {action === 'banned'
          ? `¿Confirmas suspender la cuenta de ${player.username}? No podrá iniciar sesión.`
          : `¿Confirmas reactivar la cuenta de ${player.username}?`
        }
      </p>
      {error && <p className="admin-error">{error}</p>}
      <div className="modal-actions">
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button
          className={`btn-primary ${action === 'banned' ? 'btn-danger' : ''}`}
          onClick={confirm} disabled={loading}
        >
          {loading ? 'Procesando…' : (action === 'banned' ? 'Suspender' : 'Activar')}
        </button>
      </div>
    </Modal>
  );
}
