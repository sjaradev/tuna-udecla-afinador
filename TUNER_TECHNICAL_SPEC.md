# Tuna UdeCLA — Afinador: Especificación Técnica del DSP

> Documento normativo para implementar el motor de afinación sin reinterpretar el
> diseño. Complementa a [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).
> Toda constante aquí definida vive en `src/config/tuner.ts` y debe coincidir con
> la tabla de revisión cruzada del plan (§13).

Convenciones:

- `sr` = `audioContext.sampleRate` real (nunca asumido; típicamente 44100 o 48000).
- Tiempos en ms, frecuencias en Hz, niveles en dBFS, desviaciones en cents.
- "Modo N" = Normal, "Modo R" = Ambiente ruidoso.
- Todo el código de esta especificación es TypeScript puro en `src/dsp/`, sin
  dependencias de DOM ni de Web Audio, testeable en Vitest.

---

## 1. Teoría musical (`src/dsp/music.ts`)

### 1.1 Fórmulas

```
midi(f)      = 69 + 12 · log2(f / a4)
f(midi)      = a4 · 2^((midi − 69) / 12)
cents(f, fo) = 1200 · log2(f / fo)
```

- `a4` es la referencia configurable (430–450, default 440).
- Nota cromática más cercana: `m = round(midi(f))`; desviación
  `c = 100 · (midi(f) − m)` (equivalente a `cents(f, f(m))`).
- Nombres internacionales: `['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']`,
  índice `m mod 12`, octava `floor(m / 12) − 1`.
- Nombres latinos: `['DO','DO♯','RE','RE♯','MI','FA','FA♯','SOL','SOL♯','LA','LA♯','SI']`,
  mismo índice y octava.
- Sostenidos como forma canónica (los presets solo usan ♯).

### 1.2 Cuerda más cercana de un preset (modo automático)

Dada `f` y un preset con frecuencias objetivo `{f_i}` (calculadas con la `a4`
vigente), la cuerda de referencia es:

```
i* = argmin_i |1200 · log2(f / f_i)|
```

La frontera entre dos cuerdas adyacentes queda a mitad del intervalo **en escala
logarítmica** (media geométrica de sus frecuencias). Los cents mostrados son
`cents(f, f_{i*})`.

### 1.3 Constantes de tiempo → coeficiente EMA

Para una EMA con constante de tiempo τ (ms) y paso Δt (ms):

```
α = 1 − exp(−Δt / τ)
y[n] = y[n−1] + α · (x[n] − y[n−1])
```

---

## 2. Tabla de parámetros (`src/config/tuner.ts`)

Todos los valores del sistema en un solo archivo, agrupados por modo. La
sensibilidad del usuario desplaza los umbrales de nivel: Baja = +6 dB (exige más
señal), Alta = −6 dB.

| Parámetro | Símbolo | Normal | Ruidoso |
|---|---|---|---|
| Hop de análisis (muestras) | `HOP` | 1024 | 1024 |
| Ventana mínima / máxima | `N_MIN / N_MAX` | 2048 / 8192 | 2048 / 8192 |
| Umbral de key maximum MPM | `K_CLARITY` | 0.80 | 0.85 |
| Claridad mínima para frame válido | `CLARITY_MIN` | 0.60 | 0.70 |
| Gate: mínimo absoluto | `GATE_FLOOR_DB` | −62 | −56 |
| Gate: apertura sobre piso | `GATE_OPEN_DB` | +9 | +13 |
| Gate: cierre sobre piso | `GATE_CLOSE_DB` | +5 | +8 |
| Piso de ruido: τ subida / bajada | `NOISE_TAU_UP / DOWN` | 400 / 3000 ms | 400 / 3000 ms |
| Transiente: salto de RMS | `TRANSIENT_DB` | 6 dB | 6 dB |
| Transiente: bloqueo | `TRANSIENT_HOLD` | 70 ms | 100 ms |
| Rango modo cuerda | `STRING_RANGE_CENTS` | ±600 | ±600 |
| Búfer estabilizador | `BUF_SIZE` | 7 | 9 |
| Outlier vs. mediana | `OUTLIER_CENTS` | 35 | 25 |
| Frames válidos mínimos | `MIN_VALID` | 3 | 5 |
| EMA τ normal / rápida | `EMA_TAU / EMA_TAU_FAST` | 120 / 35 ms | 220 / 35 ms |
| Umbral EMA rápida | `EMA_FAST_CENTS` | 15 | 15 |
| Pitch lock: desviación máxima | `LOCK_CENTS` | 60 | 40 |
| Pitch lock: frames para re-bloquear | `RELOCK_FRAMES` | 4 | 6 |
| Salto de octava sostenido | `OCTAVE_FRAMES` | 8 | 12 |
| Histéresis cambio de nota | `NOTE_HYST_CENTS` | ±65 | ±65 |
| Resolución de display | `DISPLAY_STEP_CENTS` | 0.5 | 0.5 |
| Zona muerta (solo "Afinado") | `DEAD_ZONE_CENTS` | ±2 | ±2 |
| Afinado: umbral / tiempo / salida | `TUNED_CENTS / TUNED_MS / UNTUNED` | ±5 / 400 / >7 por 150 ms | ±5 / 550 / >7 por 150 ms |
| Retención tras pérdida de señal | `HOLD_MS` | 700 | 700 |
| Rango cromático | — | 40–2000 Hz | 40–2000 Hz |
| Etiquetas de estado | — | Muy bajo < −15 · Bajo −15…−5 · Afinado ±5 · Alto +5…+15 · Muy alto > +15 (histéresis 2 cents) | igual |

Rangos por preset (modo instrumento): `[f_grave · 2^(−0.5), f_aguda · 2^(+0.5)]`
(media octava de margen sobre la cuerda más grave y la más aguda).

---

## 3. Pipeline por frame (`src/dsp/pipeline.ts`)

El worker acumula muestras y, por cada `HOP` nuevas, ejecuta `processFrame()`
sobre la ventana de análisis `x[0..N−1]` (las últimas N muestras):

```
processFrame(x, sr, ctx) -> FrameResult:
  1. xf   = applyBiquads(x, ctx.filters)            // §4.1
  2. lvl  = levelAnalysis(xf, sr, ctx.level)        // §4.2  (RMS, piso, gate)
  3. if lvl.gateClosed      -> reject(REJECT_GATE,      lvl)
  4. if transientDetected   -> reject(REJECT_TRANSIENT, lvl) // §4.3
  5. cand = mpmDetect(xf, sr, ctx.search)           // §5    (freq, clarity)
  6. if cand.clarity < CLARITY_MIN -> reject(REJECT_CLARITY, lvl, cand)
  7. harm = resolveHarmonics(cand, ctx)             // §6
  8. if harm == null          -> reject(REJECT_HARMONIC_CONFLICT, lvl, cand)
  9. reading = stabilizer.push(harm, lvl, nowMs)    // §7
  10. return reading                                  // -> TunerReading §8
```

`FrameResult` siempre lleva `level` (RMS, piso, gate) para la UI/debug, incluso
en los rechazos.

Códigos de rechazo: `REJECT_GATE`, `REJECT_TRANSIENT`, `REJECT_CLARITY`,
`REJECT_RANGE`, `REJECT_HARMONIC_CONFLICT`, `REJECT_LOCK`.

---

## 4. Nivel, ruido y transientes (`src/dsp/level.ts`, `src/dsp/filters.ts`)

### 4.1 Filtros biquad (fórmulas RBJ)

Paso alto: `fc_hp = 0.6 · fMin_busqueda`. Paso bajo:
`fc_lp = clamp(8 · fMax_busqueda, 800, 5000)`. Ambos Butterworth Q = 1/√2.

```
w0 = 2π·fc/sr;  cw = cos(w0);  sw = sin(w0);  αq = sw/(2Q)

Paso alto:  b0 = (1+cw)/2;  b1 = −(1+cw);  b2 = (1+cw)/2
Paso bajo:  b0 = (1−cw)/2;  b1 = 1−cw;      b2 = (1−cw)/2
Común:      a0 = 1+αq;      a1 = −2cw;      a2 = 1−αq
(normalizar b_i y a_i por a0)

y[n] = b0·x[n] + b1·x[n−1] + b2·x[n−2] − a1·y[n−1] − a2·y[n−2]
```

Los coeficientes se recalculan solo cuando cambia el preset, la cuerda o la `a4`.

### 4.2 RMS, dBFS, piso de ruido y gate

```
rms   = sqrt( Σ xf[i]² / N )
dbfs  = 20 · log10(max(rms, 1e−7))

// Piso de ruido: EMA asimétrica, congelada con gate abierto
if gateAbierto: noiseFloor = noiseFloor          // congelar
else:
  τ = (dbfs > noiseFloor) ? NOISE_TAU_UP : NOISE_TAU_DOWN
  noiseFloor += (1 − exp(−Δt/τ)) · (dbfs − noiseFloor)

// Gate con histéresis (sensOffset = +6 Baja, 0 Media, −6 Alta)
umbralAbrir = max(GATE_FLOOR_DB, noiseFloor + GATE_OPEN_DB)  + sensOffset
umbralCerrar = max(GATE_FLOOR_DB, noiseFloor + GATE_CLOSE_DB) + sensOffset
if !gateAbierto && dbfs > umbralAbrir  -> abrir
if  gateAbierto && dbfs < umbralCerrar -> cerrar
```

### 4.3 Rechazo de transientes

```
mediana3 = mediana(rms de los 3 hops anteriores)
if 20·log10(rms / max(mediana3, 1e−7)) > TRANSIENT_DB:
    bloquearLecturasHasta = now + TRANSIENT_HOLD
    stabilizer.resetBuffer()        // el ataque de la púa no entra al búfer
```

El bloqueo aplica a la *publicación* de lecturas; el piso de ruido y el gate
siguen actualizándose.

---

## 5. MPM — McLeod Pitch Method (`src/dsp/mpm.ts`, `src/dsp/fft.ts`)

### 5.1 Ventana

```
N = nextPow2(ceil(4 · sr / fMin_busqueda)),  acotado a [N_MIN, N_MAX]
```

El multiplicador es 4 (no 2.5): con pocos períodos en ventana, los términos de
borde de r(τ) y m'(τ) no se cancelan y sesgan el máximo (medido: ~7 cents en
110 Hz con N = 2048). Con ≥ ~9 períodos el sesgo cae bajo 1 cent.

Ejemplos a 48 kHz: cromático/guitarrón automático (fMin ≈ 40–47 Hz) → N = 4096;
bandurria (fMin ≈ 131 Hz) → N = 2048.

**Ventana rectangular, sin Hann.** Una ventana clásica sesga la posición del
máximo de la NSDF hacia τ menores (la autocorrelación y m'(τ) decaen distinto
con τ); el error crece en graves (medido: ~12 cents en 82 Hz, ~47 cents en
41 Hz). MPM es un método de dominio temporal y no necesita ventana.

### 5.2 NSDF por FFT

```
1. Zero-padding: X = FFT(x, 2N)                        // ventana rectangular (ver §5.1)
2. ACF: r = IFFT(|X|²)  -> r[τ], τ = 0..N−1            // autocorrelación
3. m'(τ) = 2·Σ_{i=0}^{N−1−τ} (x[i]² + x[i+τ]²)         // incremental:
   m'(0) = 2·Σ x²;  m'(τ) = m'(τ−1) − x[N−τ]² − x[τ−1]² ... (forma O(N) total)
4. NSDF: n(τ) = 2·r[τ] / m'(τ)    (con guarda m'(τ) > ε)
```

Nota de implementación: `m'(τ)` se calcula con la recurrencia estándar del paper
de MPM en O(N) total, no O(N²).

### 5.3 Selección del período

```
1. Buscar máximos locales de n(τ) en τ ∈ [τMin, τMax] = [sr/fMax, sr/fMin]
   (en modo cuerda, el rango ya viene restringido a ±600 cents, ver §6.1).
2. maxClaridad = máximo valor entre esos máximos.
3. Key maxima: máximos con n(τ) ≥ K_CLARITY · maxClaridad.
4. Elegir el PRIMER key maximum (menor τ) -> τ0.   // regla anti-subarmónico
5. Interpolación parabólica sobre (τ0−1, τ0, τ0+1):
   δ = 0.5 · (n[τ0−1] − n[τ0+1]) / (n[τ0−1] − 2·n[τ0] + n[τ0+1])
   τ* = τ0 + δ   (|δ| ≤ 1; si el denominador ≈ 0, δ = 0)
6. f = sr / τ*;  clarity = n(τ0) interpolada.
7. Guardar también globalMax = (τg, n(τg)) del rango completo [sr/2000, sr/40]
   para la validación cruzada de §6.1.
```

### 5.4 Por qué no "pico FFT = frecuencia"

El pico espectral dominante en una cuerda pulsada es con frecuencia el 2.º o 3.º
parcial, no la fundamental. La NSDF mide periodicidad temporal: todos los
armónicos contribuyen al mismo τ. La FFT aquí solo acelera la autocorrelación.

---

## 6. Resolución de armónicos y octava (`src/dsp/harmonics.ts`)

### 6.1 Modo cuerda seleccionada

```
rango = [fObj · 2^(−600/1200), fObj · 2^(+600/1200)]
1. mpmDetect corre con τ restringido a ese rango (los errores de octava,
   ±1200 cents, quedan fuera por construcción).
2. Fundamental por encima del rango: si la señal también es periódica en τ0/2
   (clarityAtHalfTau ≥ 0.8 · claridad del candidato y > 0.5), el máximo elegido
   es un subarmónico de la nota real (p. ej. un tono de 200 Hz con E2
   seleccionada "cae" en 100 Hz, dentro del rango de búsqueda)
   -> reject(REJECT_RANGE).
3. Validación cruzada con globalMax (§5.3.7):
   sea fG = sr/τg y ratio = fG / f_candidato.
   if clarity(globalMax) > clarity(candidato) + 0.15
      && |ratio − round(ratio)| > 0.06   (no es relación armónica entera)
      && round(ratio) ∉ {1,2,3} o ratio < 1 con 1/ratio no entera:
        -> reject(REJECT_HARMONIC_CONFLICT)
   (una periodicidad fuerte no relacionada armónicamente = otra fuente sonora)
3. cents = cents(f, fObj);  if |cents| > 600 -> reject(REJECT_RANGE).
```

### 6.2 Modo automático (instrumento)

```
1. mpmDetect sobre el rango del preset -> f_raw, clarity.
2. Candidatos: f_raw · {1/3, 1/2, 1, 2, 3} que caigan dentro del rango del preset.
3. Score por candidato c:
   score(c) = w1 · clarityEstimada(c)
            + w2 · (1 − min(|cents(c, cuerdaMásCercana(c))| / 100, 1))
            + w3 · continuidad(c, lecturaAnterior)
   con w1 = 0.5, w2 = 0.3, w3 = 0.2;
   continuidad = 1 − min(|cents(c, f_prev)| / 600, 1) si hay f_prev, si no 0.5.
   clarityEstimada(c): para subarmónicos se degrada (×0.85 por octava hacia
   abajo) salvo que la NSDF en τ·k lo confirme (n(k·τ0) ≥ K_CLARITY·maxClaridad).
4. Elegir el candidato de mayor score -> cuerda de referencia por §1.2.
5. Salto de octava: si la cuerda elegida difiere en ±1200 cents (±30) de la
   lectura estable actual, exigir OCTAVE_FRAMES frames consecutivos coherentes
   antes de aceptar el cambio; mientras tanto, mantener la octava anterior.
```

### 6.3 Modo cromático

Sin restricción de preset: rango 40–2000 Hz, nota por §1.1, misma regla de salto
de octava sostenido (OCTAVE_FRAMES) usando la nota cromática como referencia.

---

## 7. Estabilizador (`src/dsp/stabilizer.ts`)

Estado interno: búfer circular de lecturas válidas `{cents, tMs}`, valor EMA,
nota/cuerda bloqueada, contadores de lock y de "afinado", última lectura
publicada.

```
push(reading {freq, clarity, cents, refNote}, nowMs):

  // 1. Pitch lock
  if hayLecturaEstable && |cents − centsEstable| > LOCK_CENTS:
      if los últimos RELOCK_FRAMES frames concuerdan entre sí (±15 cents):
          re-bloquear (resetear búfer y EMA al nuevo valor)
      else:
          -> reject(REJECT_LOCK), mantener lectura anterior (hasta HOLD_MS)

  // 2. Búfer + mediana
  búfer.push(cents); mantener tamaño BUF_SIZE
  if válidosEnBúfer < MIN_VALID -> no publicar (estado "Escuchando…")
  med = mediana(búfer)
  válidos = búfer filtrado a |c − med| ≤ OUTLIER_CENTS
  if |válidos| < MIN_VALID -> no publicar
  medV = mediana(válidos)

  // 3. EMA adaptativa (Δt = tiempo desde la última lectura publicada)
  τ = (|medV − ema| > EMA_FAST_CENTS) ? EMA_TAU_FAST : EMA_TAU
  α = 1 − exp(−Δt/τ)
  ema += α · (medV − ema)

  // 4. Cambio de nota/cuerda con histéresis
  if |cents(ema, notaActual)| > NOTE_HYST_CENTS:
      notaActual = notaMásCercana(ema)   // §1.1 o §1.2 según modo

  // 5. Resolución de display
  centsDisplay = round(ema / DISPLAY_STEP_CENTS) · DISPLAY_STEP_CENTS

  // 6. Zona muerta (solo si estado == "afinado")
  if estado == afinado && |centsDisplay| ≤ DEAD_ZONE_CENTS: centsDisplay = 0

  // 7. Máquina de estado "Afinado"
  if |ema| ≤ TUNED_CENTS:  tDentro += Δt;  tFuera = 0
  else:                    tFuera  += Δt;  tDentro = 0
  if estado != afinado && tDentro ≥ TUNED_MS:        estado = afinado
  if estado == afinado && |ema| > 7 && tFuera ≥ 150: estado = (alto|bajo)

  // 8. Pérdida de señal
  if no hubo lectura válida en HOLD_MS: estado = escuchando; nota = null
```

Etiqueta de estado a partir de `ema` con histéresis de 2 cents entre umbrales
(±5, ±15): `muy-bajo | bajo | afinado | alto | muy-alto`.

Salida hacia la UI: ver `TunerReading` en §8. La UI además aplica su propia
interpolación visual de la aguja (rAF), sin alterar estos valores.

---

## 8. Protocolo de mensajes (`src/audio/protocol.ts`, `src/types/index.ts`)

### 8.1 Worklet → Worker (por `MessageChannel`, transfer de ArrayBuffer)

```ts
type CaptureChunk = { type: 'chunk'; samples: Float32Array };  // 1024 muestras
```

### 8.2 Main → Worker

```ts
type MainToWorker =
  | { type: 'init'; sampleRate: number; port: MessagePort }
  | { type: 'config'; config: TunerConfig };  // modo, sensibilidad, preset,
                                              // cuerda|auto, a4, rangos
```

### 8.3 Worker → Main

```ts
type WorkerToMain =
  | { type: 'reading'; reading: TunerReading }
  | { type: 'level'; level: LevelInfo };       // para SignalHint y debug

interface TunerReading {
  tMs: number;
  state: 'listening' | 'weak' | 'unstable' | 'tracking' | 'tuned';
  freq: number | null;          // Hz detectados (display)
  cents: number | null;         // display, resolución 0.5
  noteNameIntl: string | null;  // "A4"
  noteNameLatin: string | null; // "LA4"
  stringIndex: number | null;   // cuerda/orden de referencia (modo instrumento)
  clarity: number;              // 0..1
  rmsDb: number;
  noiseFloorDb: number;
  rawCents: number | null;      // crudo, solo para ?debug=1
  rejectReason: RejectCode | null;
}
```

El worker emite `reading` a la tasa del hop (~45/s); el hilo principal publica en
el store de React solo cuando cambian los campos discretos (≤ ~15/s) y alimenta
el rAF de la aguja con el último valor.

---

## 9. Presupuesto de latencia

| Etapa | Normal | Ruidoso |
|---|---|---|
| Ventana de análisis (N=4096 @48k) | ~85 ms | ~85 ms |
| Hop hasta primera lectura | ~21 ms | ~21 ms |
| Búfer + frames mínimos | ~45–65 ms | ~85–110 ms |
| EMA (63 % del camino) | ~120 ms | ~220 ms |
| **Total típico hasta lectura estable** | **~150–250 ms** | **~350–450 ms** |
| "Afinado" sostenido adicional | 400 ms | 550 ms |

El modo ruidoso tarda más a propósito: es el precio de una lectura mucho más
estable (requisito del proyecto).

---

## 10. Especificación de pruebas (`src/test/`)

### 10.1 Generador de señales (`src/test/signals.ts`)

Funciones puras con PRNG con semilla (mulberry32) para tests deterministas:

```ts
sine(f, sr, dur, amp?)                    // seno puro
partials(f, amps[], sr, dur, decay?)      // armónicos con amplitudes y decaimiento exp
noise(sr, dur, amp, seed)                 // ruido blanco
mix(...signals)                           // suma con normalización opcional
pluck(f, sr, dur, seed)                   // Karplus-Strong (cuerda pulsada)
inharmonic(f, B, sr, dur)                 // parciales f_n = n·f·sqrt(1+B·n²)
snr(signal, noise, snrDb)                 // mezcla a relación señal/ruido dada
```

### 10.2 Casos y tolerancias

| # | Señal de entrada | Expectativa | Tolerancia |
|---|---|---|---|
| T1 | Senos puros 80–1000 Hz (barrido E2–B5) | f detectada | ≤ 1 cent |
| T2 | Senos 40–80 Hz (A1–E2) | f detectada | ≤ 2 cents |
| T3 | Seno 440 + ruido a 20 dB SNR | f detectada | ≤ 3 cents |
| T4 | partials(110, [0.3, 1.0, 0.8, 0.5]) — fundamental débil | 110 Hz (octava correcta) | ≥ 98 % de frames |
| T5 | partials con 2.º armónico 10 dB sobre fundamental | fundamental correcta | ≥ 98 % de frames |
| T6 | mix(sine(220), sine(440)) | 220 Hz | ≥ 95 % de frames |
| T7 | Silencio (30 s simulados) | ninguna nota | 100 % |
| T8 | Ruido blanco −40 dBFS | ninguna nota | ≥ 99 % de frames |
| T9 | Nota desviada +20 cents y −20 cents | cents con signo correcto | ±3 cents |
| T10 | Cambio A2 → E2 a mitad de señal | transición sin notas intermedias falsas | ≥ 95 % de frames |
| T11 | pluck() de cada cuerda de cada preset | cuerda correcta en modo automático | ≥ 95 % |
| T12 | Estabilizador: entrada con jitter ±3 cents | σ de salida | < 1 cent |
| T13 | Estabilizador: entrada estable en 0 | estado "tuned" en | 400 ± 100 ms (modo N) |
| T14 | Transiente (golpe) entre notas | sin lectura durante el bloqueo | 100 % |
| T15 | Modo cuerda: voz/ruido tonal fuera de ±600 cents | rechazado | ≥ 99 % de frames |

### 10.3 Cómo correr

`npm run test` (Vitest, entorno Node). El DSP no importa Web Audio, así que no
se requieren mocks de navegador. Los tests de `settings.ts` usan un mock mínimo
de `localStorage`.

---

## 11. Notas de implementación

- **Reutilización de búferes**: la FFT y los búferes de ventana se instancian una
  vez por configuración (N cambia solo al cambiar de preset/cuerda); nada de
  allocaciones por frame en el worker.
- **Determinismo**: `pipeline.ts` recibe `nowMs` como parámetro (no llama a
  `performance.now()` internamente) para que los tests controlen el tiempo.
- **Punto de extensión YIN**: `mpm.ts` implementa la interfaz
  `PitchDetector { detect(x, sr, range): { freq, clarity } | null }`; un
  `yin.ts` futuro podría intercambiarse sin tocar el pipeline.
- **Guitarrón**: `GUITARRON_TUNING` vive aislada en `src/config/tunings.ts` con
  un comentario que indica que es la variante a modificar si la Tuna usa otra
  afinación. Ningún otro archivo conoce sus notas.
