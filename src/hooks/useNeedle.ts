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
    let lastWritten = Number.NaN;
    const loop = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      const target = centsRef.current;
      // Suavizado visual propio (constante ~90 ms), independiente del DSP
      const alpha = 1 - Math.exp(-dt / 90);
      current += (target - current) * alpha;
      // Escribir en el DOM solo si el ángulo cambió: con la aguja quieta,
      // setAttribute cada frame forzaba repintados constantes del glow SVG
      // (calentamiento del dispositivo).
      const angle = centsToAngle(current);
      if (Math.abs(angle - lastWritten) > 0.005) {
        lastWritten = angle;
        needleRef.current?.setAttribute(
          'transform',
          `rotate(${angle.toFixed(2)} 100 100)`,
        );
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [centsRef]);

  return needleRef;
}
