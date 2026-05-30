import { useState, useEffect } from 'react';
import { api } from '../api/client.ts';
import { useWinsFeed } from '../hooks/useWinsFeed.ts';

interface Props {
  slotId: string;
}

export function JackpotDisplay({ slotId }: Props) {
  const [value, setValue]   = useState<number | null>(null);
  const [flash, setFlash]   = useState(false);
  const wins = useWinsFeed();

  // Cargar valor inicial desde la API
  useEffect(() => {
    api.getJackpot(slotId)
      .then((jp) => setValue(jp.current))
      .catch(() => {});
  }, [slotId]);

  // Escuchar actualizaciones del jackpot por WS (ya está en useWinsFeed)
  useEffect(() => {
    // useWinsFeed incluye eventos jackpot_update y jackpot
    // Aquí se procesan en useWinsFeed — ver hook
  }, [wins]);

  if (value == null) return null;

  return (
    <div className={`jackpot-display${flash ? ' jackpot-display--flash' : ''}`}>
      <span className="jackpot-display__label">🏆 JACKPOT</span>
      <span className="jackpot-display__amount">{value.toLocaleString('es')}</span>
      <span className="jackpot-display__hint">3× SEVEN para ganar</span>
    </div>
  );
}

/** Hook para sincronizar el valor del jackpot con el WebSocket */
export function useJackpotValue(slotId: string, initialValue: number | null) {
  const [value, setValue] = useState<number | null>(initialValue);

  useEffect(() => {
    if (initialValue != null) setValue(initialValue);
  }, [initialValue]);

  // Suscribirse a eventos WS manualmente
  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws    = new WebSocket(`${proto}//${window.location.host}/ws`);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as {
          type: string;
          data?: { slotId: string; current?: number; newValue?: number };
        };
        if (
          (msg.type === 'jackpot_update' || msg.type === 'jackpot') &&
          msg.data?.slotId === slotId
        ) {
          const next = msg.data.current ?? msg.data.newValue;
          if (next != null) setValue(next);
        }
      } catch { /* ignore */ }
    };

    return () => ws.close();
  }, [slotId]);

  return value;
}
