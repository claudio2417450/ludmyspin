import { useState, useEffect, type FormEvent } from 'react';
import { adminApi, ownerApi } from '../api/admin.ts';
import { Modal } from './Modal.tsx';

interface Props { role: string; }

export function AdminWallet({ role }: Props) {
  const [wallet, setWallet]   = useState<{ balance: number; limits: { maxLoadPerTx: number | null; maxLoadPerDay: number | null } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMint, setShowMint] = useState(false);

  const refresh = () => {
    adminApi.getWallet().then(setWallet).finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  if (loading) return <div className="admin-loading">Cargando billetera…</div>;

  return (
    <div>
      <div className="admin-section-header">
        <h2 className="admin-section-title">Mi billetera</h2>
        {role === 'owner' && (
          <button className="btn-primary" onClick={() => setShowMint(true)}>+ Emitir créditos</button>
        )}
      </div>

      <div className="admin-card balance-card">
        <div className="balance-card__label">SALDO DISPONIBLE PARA REPARTIR</div>
        <div className="balance-card__amount">{(wallet?.balance ?? 0).toLocaleString('es')}</div>
        <div className="balance-card__unit">créditos</div>
      </div>

      {wallet?.limits && (
        <div className="admin-card">
          <h3 className="admin-card-title">Límites impuestos por el owner</h3>
          <div className="limits-grid">
            <div className="limit-row">
              <span className="limit-row__label">Máximo por carga individual</span>
              <span className="limit-row__value">
                {wallet.limits.maxLoadPerTx == null
                  ? <em className="text-dim">Sin tope</em>
                  : wallet.limits.maxLoadPerTx.toLocaleString('es')
                }
              </span>
            </div>
            <div className="limit-row">
              <span className="limit-row__label">Máximo acumulado por día</span>
              <span className="limit-row__value">
                {wallet.limits.maxLoadPerDay == null
                  ? <em className="text-dim">Sin tope</em>
                  : wallet.limits.maxLoadPerDay.toLocaleString('es')
                }
              </span>
            </div>
          </div>
        </div>
      )}

      {showMint && (
        <MintModal onClose={() => setShowMint(false)} onDone={refresh} />
      )}
    </div>
  );
}

function MintModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [amount, setAmount]   = useState(100_000);
  const [note, setNote]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await ownerApi.mint({ amount, note: note || undefined });
      onDone(); onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally { setLoading(false); }
  };

  return (
    <Modal title="Emitir créditos al sistema" onClose={onClose}>
      <form onSubmit={submit} className="modal-form">
        <p style={{ color: 'var(--text-dim)', marginBottom: '1rem', fontSize: '.85rem' }}>
          Los créditos emitidos se añaden a tu billetera de owner. Solo el owner puede crear créditos.
        </p>
        <label className="auth-label">Cantidad a emitir
          <input className="auth-input" type="number" min={1} value={amount}
            onChange={(e) => setAmount(Number(e.target.value))} required />
        </label>
        <label className="auth-label">Nota (opcional)
          <input className="auth-input" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {error && <p className="admin-error">{error}</p>}
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Emitiendo…' : `Emitir ${amount.toLocaleString('es')} créditos`}
        </button>
      </form>
    </Modal>
  );
}
