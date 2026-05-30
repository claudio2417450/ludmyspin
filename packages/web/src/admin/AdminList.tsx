import { useState, useEffect, type FormEvent } from 'react';
import { ownerApi } from '../api/admin.ts';
import type { AdminUser } from '../api/admin.ts';
import { Modal } from './Modal.tsx';

export function AdminList() {
  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [showCreate, setShowCreate]     = useState(false);
  const [fundTarget, setFundTarget]     = useState<AdminUser | null>(null);
  const [limitsTarget, setLimitsTarget] = useState<AdminUser | null>(null);

  const refresh = () => {
    setLoading(true);
    ownerApi.getUsers()
      .then((r) => setUsers(r.users.filter((u) => u.role === 'admin')))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  if (loading) return <div className="admin-loading">Cargando admins…</div>;

  return (
    <div>
      <div className="admin-section-header">
        <h2 className="admin-section-title">Administradores</h2>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>+ Nuevo admin</button>
      </div>

      {error && <p className="admin-error">{error}</p>}

      {users.length === 0
        ? <p className="text-dim">No hay admins aún.</p>
        : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Usuario</th><th>Estado</th><th>Creado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="td-username">🛡️ {u.username}</td>
                    <td>
                      <span className={`badge badge--${u.status === 'active' ? 'green' : 'red'}`}>
                        {u.status === 'active' ? 'Activo' : 'Suspendido'}
                      </span>
                    </td>
                    <td className="td-date">{new Date(u.createdAt).toLocaleDateString('es')}</td>
                    <td className="td-actions">
                      <button className="btn-sm btn-sm--blue"   onClick={() => setFundTarget(u)}>Fondear</button>
                      <button className="btn-sm btn-sm--purple" onClick={() => setLimitsTarget(u)}>Límites</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      {showCreate  && <CreateAdminModal onClose={() => setShowCreate(false)} onCreated={refresh} />}
      {fundTarget  && <FundAdminModal admin={fundTarget}   onClose={() => setFundTarget(null)}   onDone={refresh} />}
      {limitsTarget && <LimitsModal   admin={limitsTarget} onClose={() => setLimitsTarget(null)} onDone={refresh} />}
    </div>
  );
}

// ── Modales ───────────────────────────────────────────────────────────────────

function CreateAdminModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await ownerApi.createAdmin({ username, password });
      onCreated(); onClose();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setLoading(false); }
  };

  return (
    <Modal title="Nuevo administrador" onClose={onClose}>
      <form onSubmit={submit} className="modal-form">
        <label className="auth-label">Usuario
          <input className="auth-input" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label className="auth-label">Contraseña temporal
          <input className="auth-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        </label>
        {error && <p className="admin-error">{error}</p>}
        <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Creando…' : 'Crear admin'}</button>
      </form>
    </Modal>
  );
}

function FundAdminModal({ admin, onClose, onDone }: { admin: AdminUser; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount]   = useState(10_000);
  const [note, setNote]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      await ownerApi.fundAdmin(admin.id, { amount, note: note || undefined });
      onDone(); onClose();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setLoading(false); }
  };

  return (
    <Modal title={`Fondear a ${admin.username}`} onClose={onClose}>
      <form onSubmit={submit} className="modal-form">
        <label className="auth-label">Monto
          <input className="auth-input" type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} required />
        </label>
        <label className="auth-label">Nota (opcional)
          <input className="auth-input" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {error && <p className="admin-error">{error}</p>}
        <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Fondeando…' : `Transferir ${amount.toLocaleString('es')} créditos`}</button>
      </form>
    </Modal>
  );
}

function LimitsModal({ admin, onClose, onDone }: { admin: AdminUser; onClose: () => void; onDone: () => void }) {
  const [perTx,  setPerTx]    = useState('');
  const [perDay, setPerDay]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      await ownerApi.setLimits(admin.id, {
        maxLoadPerTx:  perTx  ? Number(perTx)  : null,
        maxLoadPerDay: perDay ? Number(perDay) : null,
      });
      onDone(); onClose();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setLoading(false); }
  };

  return (
    <Modal title={`Límites para ${admin.username}`} onClose={onClose}>
      <form onSubmit={submit} className="modal-form">
        <p style={{ fontSize: '.82rem', color: 'var(--text-dim)', marginBottom: '.75rem' }}>
          Deja en blanco para quitar el tope.
        </p>
        <label className="auth-label">Máximo por carga individual
          <input className="auth-input" type="number" min={1} placeholder="Sin tope" value={perTx} onChange={(e) => setPerTx(e.target.value)} />
        </label>
        <label className="auth-label">Máximo acumulado por día
          <input className="auth-input" type="number" min={1} placeholder="Sin tope" value={perDay} onChange={(e) => setPerDay(e.target.value)} />
        </label>
        {error && <p className="admin-error">{error}</p>}
        <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Guardando…' : 'Guardar límites'}</button>
      </form>
    </Modal>
  );
}
