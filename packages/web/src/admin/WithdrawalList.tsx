import { useState, useEffect, type FormEvent } from 'react';
import { adminApi } from '../api/admin.ts';
import type { Withdrawal } from '../api/admin.ts';
import { Modal } from './Modal.tsx';

export function WithdrawalList() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [resolveTarget, setResolveTarget] = useState<{ wd: Withdrawal; action: 'approve' | 'reject' } | null>(null);

  const refresh = () => {
    setLoading(true);
    adminApi.getWithdrawals()
      .then((r) => setWithdrawals(r.withdrawals))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  if (loading) return <div className="admin-loading">Cargando retiros…</div>;

  return (
    <div>
      <h2 className="admin-section-title">Solicitudes de retiro</h2>
      {error && <p className="admin-error">{error}</p>}

      {withdrawals.length === 0
        ? <p className="text-dim">No hay solicitudes pendientes.</p>
        : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th><th>Jugador</th><th>Monto</th><th>Fecha</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((wd) => (
                  <tr key={wd.id}>
                    <td className="td-id">#{wd.id}</td>
                    <td className="td-username">👤 {wd.playerId.slice(0, 8)}…</td>
                    <td className="td-amount">{wd.amount.toLocaleString('es')}</td>
                    <td className="td-date">{new Date(wd.createdAt).toLocaleDateString('es')}</td>
                    <td className="td-actions">
                      <button className="btn-sm btn-sm--green" onClick={() => setResolveTarget({ wd, action: 'approve' })}>✓ Aprobar</button>
                      <button className="btn-sm btn-sm--red"   onClick={() => setResolveTarget({ wd, action: 'reject'  })}>✗ Rechazar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      {resolveTarget && (
        <ResolveModal
          wd={resolveTarget.wd}
          action={resolveTarget.action}
          onClose={() => setResolveTarget(null)}
          onDone={refresh}
        />
      )}
    </div>
  );
}

function ResolveModal({ wd, action, onClose, onDone }: {
  wd: Withdrawal; action: 'approve' | 'reject'; onClose: () => void; onDone: () => void;
}) {
  const [reason, setReason]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminApi.resolveWithdrawal(wd.id, { action, reason: reason || undefined });
      onDone(); onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally { setLoading(false); }
  };

  const isReject = action === 'reject';
  return (
    <Modal title={isReject ? `Rechazar retiro #${wd.id}` : `Aprobar retiro #${wd.id}`} onClose={onClose}>
      <form onSubmit={submit} className="modal-form">
        <p style={{ color: 'var(--text-dim)', marginBottom: '1rem' }}>
          {isReject
            ? `Se rechazará la solicitud de ${wd.amount.toLocaleString('es')} créditos. El saldo del jugador no cambia.`
            : `Se descontarán ${wd.amount.toLocaleString('es')} créditos del jugador y saldrán del sistema.`
          }
        </p>
        {isReject && (
          <label className="auth-label">Motivo (opcional)
            <input className="auth-input" value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
        )}
        {error && <p className="admin-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit"
            className={`btn-primary${isReject ? ' btn-danger' : ''}`}
            disabled={loading}
          >
            {loading ? 'Procesando…' : (isReject ? 'Rechazar' : 'Aprobar')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
