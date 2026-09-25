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
const NEEDLE_TIP = polar(0, R - 14);

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
        <defs>
          {/* Degradado semántico: rojo en extremos, dorado cerca, verde al centro */}
          <linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f26d6d" />
            <stop offset="28%" stopColor="#f0c04a" />
            <stop offset="50%" stopColor="#41dc8b" />
            <stop offset="72%" stopColor="#f0c04a" />
            <stop offset="100%" stopColor="#f26d6d" />
          </linearGradient>
          <filter id="needleGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="3.5"
              floodColor={needleColor}
              floodOpacity="0.9"
            />
          </filter>
        </defs>

        {/* Pista base tenue */}
        <path
          d={arcPath(-60, 60, R)}
          fill="none"
          stroke="rgb(255 255 255 / 0.08)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Arco con degradado semántico */}
        <path
          d={arcPath(-60, 60, R)}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.9"
        />
        {/* Zona "afinado" ±5 cents (±6°): realce verde brillante */}
        <path
          d={arcPath(-6, 6, R)}
          fill="none"
          stroke="#41dc8b"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.95"
        />

        {/* Ticks */}
        {TICKS.map((c) => {
          const angle = (c / 50) * 60;
          const p1 = polar(angle, R - 11);
          const p2 = polar(angle, R - 17);
          const lp = polar(angle, R - 28);
          return (
            <g key={c}>
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={c === 0 ? 'rgb(255 255 255 / 0.75)' : 'rgb(255 255 255 / 0.28)'}
                strokeWidth={c === 0 ? 2.5 : 1.5}
                strokeLinecap="round"
              />
              <text
                x={lp.x}
                y={lp.y + 3}
                textAnchor="middle"
                fontSize="8"
                fontWeight={c === 0 ? 700 : 400}
                fill="rgb(147 165 194 / 0.85)"
              >
                {c > 0 ? `+${c}` : c}
              </text>
            </g>
          );
        })}

        {/* Aguja (rotada por useNeedle vía transform) con glow */}
        <g ref={needleRef} filter="url(#needleGlow)">
          <line
            x1={CX}
            y1={CY}
            x2={NEEDLE_TIP.x}
            y2={NEEDLE_TIP.y}
            stroke={needleColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <circle cx={NEEDLE_TIP.x} cy={NEEDLE_TIP.y} r="4" fill={needleColor} />
        </g>
        <circle
          ref={centerDotRef}
          cx={CX}
          cy={CY}
          r="6"
          fill={needleColor}
          filter="url(#needleGlow)"
        />
        <circle cx={CX} cy={CY} r="2.5" fill="#050b16" />
      </svg>

      {/* Instrucciones laterales: izquierda = baja (tensa), derecha = alta (afloja) */}
      <div className="mt-1 flex justify-between text-[11px] font-medium tracking-wide text-brand-muted">
        <span>Bajo · Tensa ↑</span>
        <span className="font-bold text-brand-green">Afinado</span>
        <span>Alto · Afloja ↓</span>
      </div>
    </div>
  );
}
