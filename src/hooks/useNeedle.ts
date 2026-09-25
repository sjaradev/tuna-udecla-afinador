/**
 * Aguja del medidor: loop de requestAnimationFrame que escribe el `transform`
 * directamente en el SVG, SIN pasar por React (plan §2.4).
 * El objetivo llega por una ref mutable alimentada desde el engine.
 */
import { useEffect, useRef, type RefObject } from 'react';

const MAX_CENTS = 50;
const MAX_ANGLE_DEG = 60; // el arco visual cubre ±60° para ±50 cents

export function centsToAngle(cents: number): number {
  const clamped = Math.max(-MAX_CENTS, Math.min(MAX_CENTS, cents));
  return (clamped / MAX_CENTS) * MAX_ANGLE_DEG;
}

export function useNeedle(
  centsRef: RefObject<number>,
): RefObject<SVGGElement | null> {
  const needleRef = useRef<SVGGElement>(null);

  useEffect(() => {
    let raf = 0;
    let current = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      const target = centsRef.current;
      // Suavizado visual propio (constante ~90 ms), independiente del DSP
      const alpha = 1 - Math.exp(-dt / 90);
      current += (target - current) * alpha;
      needleRef.current?.setAttribute(
        'transform',
        `rotate(${centsToAngle(current).toFixed(2)} 100 100)`,
      );
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [centsRef]);

  return needleRef;
}
