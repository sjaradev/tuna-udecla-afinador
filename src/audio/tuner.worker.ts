/**
 * Worker de DSP: acumula los chunks del worklet en un búfer circular y ejecuta
 * el pipeline cada HOP muestras. Emite TunerReading + LevelInfo al hilo
 * principal (spec §8).
 */
import { TunerPipeline } from '../dsp/pipeline';
import { HOP } from '../config/tuner';
import type {
  CaptureChunk,
  LevelInfo,
  MainToWorker,
  TunerConfig,
  TunerReading,
  WorkerToMain,
} from '../types';

interface WorkerScope {
  onmessage: ((e: MessageEvent<MainToWorker>) => void) | null;
  postMessage(msg: WorkerToMain, transfer?: Transferable[]): void;
}

const ctx = self as unknown as WorkerScope;

let pipeline: TunerPipeline | null = null;
let capturePort: MessagePort | null = null;
let ring: Float32Array | null = null;
let writeIdx = 0;
let sinceLastAnalysis = 0;
let windowBuf: Float32Array | null = null;

function handleChunk(chunk: CaptureChunk): void {
  if (!pipeline || !ring || !windowBuf) return;
  const n = ring.length;
  const samples = chunk.samples;

  for (let i = 0; i < samples.length; i++) {
    ring[writeIdx] = samples[i];
    writeIdx = (writeIdx + 1) % n;
  }
  sinceLastAnalysis += samples.length;

  while (sinceLastAnalysis >= HOP) {
    sinceLastAnalysis -= HOP;
    // Linealizar la ventana: las últimas `n` muestras en orden temporal
    for (let i = 0; i < n; i++) {
      windowBuf[i] = ring[(writeIdx + i) % n];
    }
    const { reading, level } = pipeline.processWindow(
      windowBuf,
      performance.now(),
    );
    ctx.postMessage({ type: 'reading', reading } satisfies {
      type: 'reading';
      reading: TunerReading;
    });
    ctx.postMessage({ type: 'level', level } satisfies {
      type: 'level';
      level: LevelInfo;
    });
  }
}

ctx.onmessage = (e: MessageEvent<MainToWorker>) => {
  const msg = e.data;
  if (msg.type === 'init') {
    pipeline = new TunerPipeline(msg.sampleRate, msg.config);
    const n = pipeline.windowSize;
    ring = new Float32Array(n);
    windowBuf = new Float32Array(n);
    writeIdx = 0;
    sinceLastAnalysis = 0;
    capturePort = msg.port;
    capturePort.onmessage = (ev: MessageEvent<CaptureChunk>) => {
      if (ev.data?.type === 'chunk') handleChunk(ev.data);
    };
    ctx.postMessage({ type: 'configAck', config: msg.config });
  } else if (msg.type === 'config') {
    applyConfig(msg.config);
    ctx.postMessage({ type: 'configAck', config: msg.config });
  }
};

function applyConfig(config: TunerConfig): void {
  if (!pipeline) return;
  const prevWindow = pipeline.windowSize;
  pipeline.setConfig(config);
  if (pipeline.windowSize !== prevWindow && ring) {
    // El tamaño de ventana cambió: reiniciar el búfer circular
    const n = pipeline.windowSize;
    ring = new Float32Array(n);
    windowBuf = new Float32Array(n);
    writeIdx = 0;
    sinceLastAnalysis = 0;
  }
}
