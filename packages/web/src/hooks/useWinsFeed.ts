import { useState, useEffect } from 'react';

export interface WinEntry {
  username: string;
  slotName: string;
  payout:   number;
  bet:      number;
  symbol:   string;
  at:       string;
  id:       number;   // local key para React
}

const MAX_ENTRIES = 10;
let nextId = 0;

export function useWinsFeed() {
  const [wins, setWins] = useState<WinEntry[]>([]);

  useEffect(() => {
    const proto  = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl  = `${proto}//${window.location.host}/ws`;
    let ws: WebSocket;
    let closed   = false;

    const connect = () => {
      if (closed) return;
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as { type: string; data?: WinEntry };
          if (msg.type === 'win' && msg.data) {
            setWins((prev) => [{ ...msg.data!, id: ++nextId }, ...prev].slice(0, MAX_ENTRIES));
          }
        } catch { /* ignore malformed */ }
      };

      ws.onerror  = () => {};
      ws.onclose  = () => { if (!closed) setTimeout(connect, 3000); };  // reconectar
    };

    connect();
    return () => { closed = true; ws?.close(); };
  }, []);

  return wins;
}
