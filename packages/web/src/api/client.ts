export interface WinLine {
  paylineId:  number;
  symbol:     string;
  count:      number;
  multiplier: number;
  payout:     number;
}

export interface SpinStep {
  reelPositions: number[];
  grid:          string[][];
  winLines:      WinLine[];
  payout:        number;
}

export interface SpinResponse {
  spinId:         number;
  result:         string[][];
  steps:          SpinStep[];
  payout:         number;
  bet:            number;
  balance:        number;
  currency:       string;
  features:       { multiplier: number; freeSpinsLeft: number; freeSpinsGiven: number; sessionId: string | null };
  serverSeedHash: string;
  nonce:          number;
  jackpot:        { name: string; won: boolean; amount: number; current: number } | null;
}

export interface LoginResponse {
  token:               string;
  role:                'player' | 'admin' | 'owner';
  mustChangePassword:  boolean;
  balance:             number;
}

function getToken() { return localStorage.getItem('token') ?? ''; }

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error((body as { error?: string }).error ?? 'Error'), { status: res.status });
  }
  return res.json() as Promise<T>;
}

export const api = {
  login: (body: { username: string; password: string }) =>
    apiFetch<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    apiFetch<{ ok: boolean; token: string }>('/auth/change-password', {
      method: 'POST', body: JSON.stringify(body),
    }),

  getWallet: () =>
    apiFetch<{ balance: number }>('/wallet'),

  spin: (slotId: string, body: { bet: number; clientSeed?: string }, idempotencyKey: string) =>
    apiFetch<SpinResponse>(`/slots/${slotId}/spin`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Idempotency-Key': idempotencyKey },
    }),

  getHistory: (params?: { wins?: boolean; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.wins)  qs.set('wins', 'true');
    if (params?.limit) qs.set('limit', String(params.limit));
    return apiFetch<{ spins: unknown[] }>(`/history?${qs}`);
  },

  getSlots: () =>
    apiFetch<{ slots: SlotInfo[] }>('/slots'),

  getJackpot: (slotId: string) =>
    apiFetch<{ name: string; current: number; seed: number; lastWonAt: string | null; lastWonAmount: number | null }>(`/jackpots/${slotId}`),

  getSlotConfig: (id: string) =>
    apiFetch<SlotConfig>(`/slots/${id}/config`),

  requestWithdrawal: (body: { amount: number | 'all' }) =>
    apiFetch<{ withdrawalId: number; amount: number; status: string }>(
      '/withdrawals', { method: 'POST', body: JSON.stringify(body) }
    ),

  getWithdrawals: () =>
    apiFetch<{ withdrawals: unknown[] }>('/withdrawals'),
};

export interface SlotInfo {
  id:       string;
  name:     string;
  numRows:  number;
  paylines: Array<{ id: number; positions: number[] }>;
  minBet:   number;
  maxBet:   number;
  /** Símbolos únicos del slot (para cycling durante spin e initial grid) */
  symbols?: string[];
}

export interface SlotConfig extends SlotInfo {
  paytable:  Record<string, Record<number, number>>;
  targetRtp: number;
  features:  Record<string, unknown>;
}
