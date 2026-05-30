import { apiFetch } from './client.ts';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface Player {
  id:        string;
  username:  string;
  status:    'active' | 'banned';
  createdAt: string;
}

export interface PlayerWithBalance extends Player {
  balance: number;
}

export interface AdminStats {
  players: number;
  spins:   number | string;
  paid:    number | string;
}

export interface AdminWalletInfo {
  balance: number;
  limits:  { maxLoadPerTx: number | null; maxLoadPerDay: number | null };
}

export interface Withdrawal {
  id:        number;
  playerId:  string;
  amount:    number;
  status:    'pending' | 'approved' | 'rejected';
  createdAt: string;
  username?: string;
}

export interface AdminUser {
  id:        string;
  username:  string;
  role:      string;
  status:    string;
  createdBy: string | null;
  createdAt: string;
}

// ── Admin endpoints ───────────────────────────────────────────────────────────

export const adminApi = {
  // Jugadores
  getPlayers: () =>
    apiFetch<{ players: Player[] }>('/admin/players'),

  createPlayer: (body: { username: string; password: string }) =>
    apiFetch<{ playerId: string; username: string }>('/admin/players', {
      method: 'POST', body: JSON.stringify(body),
    }),

  updatePlayer: (id: string, body: { status: 'active' | 'banned' }) =>
    apiFetch<{ ok: boolean }>(`/admin/players/${id}`, {
      method: 'PATCH', body: JSON.stringify(body),
    }),

  loadCredit: (playerId: string, body: { amount: number; note?: string }) =>
    apiFetch<{ ok: boolean }>(`/admin/players/${playerId}/credit`, {
      method: 'POST', body: JSON.stringify(body),
    }),

  // Retiros
  getWithdrawals: () =>
    apiFetch<{ withdrawals: Withdrawal[] }>('/admin/withdrawals'),

  resolveWithdrawal: (id: number, body: { action: 'approve' | 'reject'; reason?: string }) =>
    apiFetch<{ ok: boolean }>(`/admin/withdrawals/${id}`, {
      method: 'PATCH', body: JSON.stringify(body),
    }),

  // Stats y wallet
  getStats:  () => apiFetch<AdminStats>('/admin/stats'),
  getWallet: () => apiFetch<AdminWalletInfo>('/admin/wallet'),
};

// ── Owner endpoints ───────────────────────────────────────────────────────────

export const ownerApi = {
  getUsers: () =>
    apiFetch<{ users: AdminUser[] }>('/owner/users'),

  createAdmin: (body: { username: string; password: string }) =>
    apiFetch<{ adminId: string; username: string }>('/owner/admins', {
      method: 'POST', body: JSON.stringify(body),
    }),

  fundAdmin: (adminId: string, body: { amount: number; note?: string }) =>
    apiFetch<{ ok: boolean }>(`/owner/admins/${adminId}/fund`, {
      method: 'POST', body: JSON.stringify(body),
    }),

  setLimits: (adminId: string, body: { maxLoadPerTx: number | null; maxLoadPerDay: number | null }) =>
    apiFetch<{ ok: boolean }>(`/owner/admins/${adminId}/limits`, {
      method: 'PATCH', body: JSON.stringify(body),
    }),

  mint: (body: { amount: number; note?: string }) =>
    apiFetch<{ ok: boolean; minted: number }>('/owner/mint', {
      method: 'POST', body: JSON.stringify(body),
    }),

  getStats:        () => apiFetch<{ totalEmitted: number | string }>('/owner/stats'),
  getTransactions: () => apiFetch<{ transactions: unknown[] }>('/owner/transactions'),
};
