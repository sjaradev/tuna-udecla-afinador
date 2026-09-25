/**
 * Medidor semicircular de cents: −50 … 0 … +50 (plan §6.1).
 * La aguja se mueve por rAF escribiendo `transform` en el SVG (sin React).
 *
 * Dirección (corregida): izquierda = cuerda BAJA (tensa),
 * derecha = cuerda ALTA (afloja).
 */
import { useRef, type RefObject } from 'react';
import { useNeedle } from '../../hooks/useNeedle';

interface Props {
  /** Ref mutable con los cents actuales (canal rápido, fuera de React). */
  centsRef: RefObject<number>;
  /** Color de la aguja según estado. */
  needleColor: string;
}

const CX = 100;
const CY = 100;
const R = 78;

function polar(angleDeg: number, r: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function arcPath(fromDeg: number, toDeg: number, r: number): string {
  const a = polar(fromDeg, r);
  const b = polar(toDeg, r);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

const TICKS = [-50, -25, 0, 25, 50];

export function CentsGauge({ centsRef, needleColor }: Props) {
  const needleRef = useNeedle(centsRef);
  const centerDotRef = useRef<SVGCircleElement>(null);

  return (
    <div className="w-full max-w-sm">
      <svg
        viewBox="0 0 200 118"
        className="w-full"
        role="meter"
        aria-valuemin={-50}
        aria-valuemax={50}
        aria-valuenow={Math.round(centsRef.current)}
        aria-label="Desviación en cents"
      >
        {/* Arco base */}
        <path
          d={arcPath(-60, 60, R)}
          fill="none"
          stroke="#1a3050"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Zona "afinado" ±5 cents (±6°) */}
        <path
          d={arcPath(-6, 6, R)}
          fill="none"
          stroke="#3fce7a"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* Zonas "cerca" ±5–15 cents (±6–18°) */}
        <path d={arcPath(-18, -6, R)} fill="none" stroke="#e8b93b" strokeWidth="10" opacity="0.5" />
        <path d={arcPath(6, 18, R)} fill="none" stroke="#e8b93b" strokeWidth="10" opacity="0.5" />

        {/* Ticks */}
        {TICKS.map((c) => {
          const angle = (c / 50) * 60;
          const p1 = polar(angle, R - 12);
          const p2 = polar(angle, R - 20);
          const lp = polar(angle, R - 30);
          return (
            <g key={c}>
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="#8fa3bf"
                strokeWidth={c === 0 ? 3 : 1.5}
              />
              <text
                x={lp.x}
                y={lp.y + 3}
                textAnchor="middle"
                fontSize="8"
                fill="#8fa3bf"
              >
                {c > 0 ? `+${c}` : c}
              </text>
            </g>
          );
        })}

        {/* Aguja (rotada por useNeedle vía transform) */}
        <g ref={needleRef}>
          <line
            x1={CX}
            y1={CY}
            x2={CX}
            y2={CY - R + 14}
            stroke={needleColor}
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
        <circle ref={centerDotRef} cx={CX} cy={CY} r="7" fill={needleColor} />
      </svg>

      {/* Instrucciones laterales: izquierda = baja (tensa), derecha = alta (afloja) */}
      <div className="mt-1 flex justify-between text-xs text-brand-muted">
        <span>Bajo · Tensa ↑</span>
        <span className="font-semibold text-brand-green">Afinado</span>
        <span>Alto · Afloja ↓</span>
      </div>
    </div>
  );
}
