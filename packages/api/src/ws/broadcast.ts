import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import type { Server } from 'node:http';

const clients = new Set<WebSocket>();

export type BroadcastMsg =
  | { type: 'win';             data: WinData }
  | { type: 'jackpot';         data: JackpotWinData }
  | { type: 'jackpot_update';  data: JackpotUpdateData }
  | { type: 'connected';       clients: number }
  | { type: 'ping' };

export interface WinData {
  username: string;
  slotName: string;
  payout:   number;
  bet:      number;
  symbol:   string;
  at:       string;
}

export interface JackpotWinData {
  username:  string;
  slotName:  string;
  slotId:    string;
  amount:    number;
  newValue:  number;
  at:        string;
}

export interface JackpotUpdateData {
  slotId:  string;
  current: number;
}

export function broadcast(msg: BroadcastMsg): void {
  const data = JSON.stringify(msg);
  for (const client of clients) {
    if (client.readyState === 1) client.send(data);
  }
}

export function setupWss(httpServer: Server): void {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
    ws.on('error', ()  => clients.delete(ws));
    ws.send(JSON.stringify({ type: 'connected', clients: clients.size } satisfies BroadcastMsg));
  });

  setInterval(() => {
    broadcast({ type: 'ping' });
  }, 45_000);
}
