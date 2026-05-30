import { useState, useEffect } from 'react';
import { adminApi, ownerApi } from '../api/admin.ts';

interface Props {
  role: string;
}

export function Dashboard({ role }: Props) {
  const [stats, setStats]   = useState<{ players: number; spins: number | string; paid: number | string } | null>(null);
  const [wallet, setWallet] = useState<{ balance: number; limits: { maxLoadPerTx: number | null; maxLoadPerDay: number | null } } | null>(null);
  const [ownerStats, setOwnerStats] = useState<{ totalEmitted: number | string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.getStats().then(setStats),
      adminApi.getWallet().then(setWallet),
      role === 'owner' ? ownerApi.getStats().then(setOwnerStats) : Promise.resolve(),
    ]).finally(() => setLoading(false));
  }, [role]);

  if (loading) return <div className="admin-loading">Cargando…</div>;

  return (
    <div className="dashboard">
      <h2 className="admin-section-title">Dashboard</h2>

      <div className="stat-grid">
        <StatCard label="Mis jugadores"  value={stats?.players ?? 0}      icon="👥" />
        <StatCard label="Giros totales"  value={stats?.spins ?? 0}         icon="🎰" color="purple" />
        <StatCard label="Créditos pagados" value={Number(stats?.paid ?? 0)} icon="💰" color="green" />
        <StatCard label="Mi bolsa"       value={wallet?.balance ?? 0}      icon="🏦" color="gold" />
      </div>

      {wallet?.limits && (
        <div className="admin-card">
          <h3 className="admin-card-title">Límites de carga</h3>
          <div className="limits-grid">
            <LimitRow label="Por transacción" value={wallet.limits.maxLoadPerTx} />
            <LimitRow label="Por día"         value={wallet.limits.maxLoadPerDay} />
          </div>
        </div>
      )}

      {role === 'owner' && ownerStats && (
        <div className="admin-card">
          <h3 className="admin-card-title">Emisión total (Owner)</h3>
          <p className="stat-big">{Number(ownerStats.totalEmitted).toLocaleString('es')} <span className="stat-unit">créditos emitidos</span></p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color = 'default' }: {
  label: string; value: number | string; icon: string; color?: string;
}) {
  return (
    <div className={`stat-card stat-card--${color}`}>
      <span className="stat-card__icon">{icon}</span>
      <div>
        <div className="stat-card__value">{Number(value).toLocaleString('es')}</div>
        <div className="stat-card__label">{label}</div>
      </div>
    </div>
  );
}

function LimitRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="limit-row">
      <span className="limit-row__label">{label}</span>
      <span className="limit-row__value">
        {value == null ? <em className="text-dim">Sin tope</em> : value.toLocaleString('es')}
      </span>
    </div>
  );
}
