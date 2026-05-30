import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { api } from '../api/client.ts';
import type { SpinResponse, SpinStep } from '../api/client.ts';

export type SpinPhase = 'idle' | 'spinning' | 'cascade' | 'stopped';

const MIN_SPIN_MS    = 1800;   // animación mínima de rodillos
const CASCADE_PAUSE  = 700;    // ms entre pasos de cascada
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function useSpin(slotId: string, onBalance: (b: number) => void) {
  const [phase, setPhase]           = useState<SpinPhase>('idle');
  const [result, setResult]         = useState<SpinResponse | null>(null);
  const [visibleStep, setVisibleStep] = useState<SpinStep | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const pendingResult               = useRef<SpinResponse | null>(null);

  const doSpin = useCallback(async (bet: number) => {
    if (phase !== 'idle') return;
    setPhase('spinning');
    setError(null);
    pendingResult.current = null;

    const idempKey  = uuidv4();
    const startedAt = Date.now();

    try {
      const res = await api.spin(slotId, { bet }, idempKey);
      pendingResult.current = res;

      // Garantizar animación mínima de rodillos
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_SPIN_MS) await sleep(MIN_SPIN_MS - elapsed);

      setResult(res);
      onBalance(res.balance);

      // Mostrar cada paso de cascada secuencialmente
      const steps = res.steps ?? [];
      for (let i = 0; i < steps.length; i++) {
        if (i > 0) {
          setPhase('cascade');
          await sleep(CASCADE_PAUSE);
        }
        setVisibleStep(steps[i]);
        if (i < steps.length - 1) await sleep(CASCADE_PAUSE);
      }

      setPhase('stopped');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setError(msg);
      setPhase('idle');
    }
  }, [slotId, phase, onBalance]);

  const resetToIdle = useCallback(() => {
    setPhase('idle');
    setVisibleStep(null);
  }, []);

  return { phase, result, visibleStep, error, doSpin, resetToIdle };
}
