import { useState, type FormEvent } from 'react';
import { apiFetch } from '../api/client.ts';

interface Props {
  balance:  number;
  onClose:  () => void;
  onDone:   () => void;
}

export function WithdrawalModal({ balance, onClose, onDone }: Props) {
  const [mode, setMode]       = useState<'all' | 'partial'>('all');
  const [amount, setAmount]   = useState(Math.min(balance, 1000));
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState<{ id: number; amount: number } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const body = mode === 'all' ? { amount: 'all' } : { amount };
      const res = await apiFetch<{ withdrawalId: number; amount: number; status: string }>(
        '/withdrawals', { method: 'POST', body: JSON.stringify(body) }
      );
      setDone({ id: res.withdrawalId, amount: res.amount });
      onDone();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">💸 Solicitar retiro</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {done ? (
            <div className="withdrawal-success">
              <div className="withdrawal-success__icon">✅</div>
              <p>Solicitud #{done.id} enviada por <strong>{done.amount.toLocaleString('es')} créditos</strong>.</p>
              <p style={{ color: 'var(--text-dim)', fontSize: '.85rem', marginTop: '.5rem' }}>
                Un admin la revisará y aprobará o rechazará.
              </p>
              <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={onClose}>Cerrar</button>
            </div>
          ) : (
            <form onSubmit={submit} className="modal-form">
              <p style={{ color: 'var(--text-dim)', fontSize: '.85rem' }}>
                Saldo disponible: <strong style={{ color: 'var(--gold)' }}>{balance.toLocaleString('es')}</strong> créditos
              </p>

              <div className="withdrawal-mode">
                <button type="button"
                  className={`mode-btn${mode === 'all' ? ' mode-btn--active' : ''}`}
                  onClick={() => setMode('all')}
                >Todo el saldo</button>
                <button type="button"
                  className={`mode-btn${mode === 'partial' ? ' mode-btn--active' : ''}`}
                  onClick={() => setMode('partial')}
                >Monto parcial</button>
              </div>

              {mode === 'partial' && (
                <label className="auth-label">Monto a retirar
                  <input className="auth-input" type="number" min={1} max={balance}
                    value={amount} onChange={(e) => setAmount(Number(e.target.value))} required />
                </label>
              )}

              {error && <p className="admin-error">{error}</p>}

              <button className="btn-primary" type="submit" disabled={loading || balance === 0}>
                {loading ? 'Enviando…' : 'Solicitar retiro'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
