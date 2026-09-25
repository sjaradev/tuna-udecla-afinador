/**
 * Motor de audio: ciclo de vida del micrófono, AudioContext, worklet (con
 * fallback a ScriptProcessor) y worker de DSP (spec §4 del plan).
 *
 * Reglas clave:
 * - start() debe llamarse desde un gesto del usuario: crea y reanuda el
 *   AudioContext de forma síncrona, ANTES de await getUserMedia.
 * - El audio nunca se graba ni sale del dispositivo.
 */
import workletUrl from './capture-worklet.ts?worker&url';
import type {
  MainToWorker,
  MicError,
  MicState,
  TunerConfig,
  WorkerToMain,
} from '../types';

type StateListener = (state: MicState, error: MicError | null) => void;
type ReadingListener = (msg: WorkerToMain) => void;

// El preprocesado del teléfono (supresión de ruido, AGC) destruye la
// estructura armónica de los instrumentos: se exige desactivado (exacto).
const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    channelCount: { ideal: 1 },
  },
};

// Respaldo para dispositivos que rechazan las restricciones exactas.
const MIC_CONSTRAINTS_FALLBACK: MediaStreamConstraints = {
  audio: {
    echoCancellation: { ideal: false },
    noiseSuppression: { ideal: false },
    autoGainControl: { ideal: false },
    channelCount: { ideal: 1 },
  },
};

/** Pide el micrófono sin preprocesado; cae al modo "ideal" si no es posible. */
async function requestMic(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'OverconstrainedError') {
      return navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS_FALLBACK);
    }
    throw err;
  }
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private worker: Worker | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private fallbackNode: ScriptProcessorNode | null = null;
  private muteGain: GainNode | null = null;
  private config: TunerConfig | null = null;

  private state: MicState = 'idle';
  private error: MicError | null = null;
  private stateListeners = new Set<StateListener>();
  private readingListeners = new Set<ReadingListener>();
  private visibilityHandler: (() => void) | null = null;
  private wasRunningBeforeHidden = false;

  getState(): MicState {
    return this.state;
  }

  getError(): MicError | null {
    return this.error;
  }

  onState(cb: StateListener): () => void {
    this.stateListeners.add(cb);
    return () => this.stateListeners.delete(cb);
  }

  onReading(cb: ReadingListener): () => void {
    this.readingListeners.add(cb);
    return () => this.readingListeners.delete(cb);
  }

  private setState(state: MicState, error: MicError | null = null): void {
    this.state = state;
    this.error = error;
    for (const cb of this.stateListeners) cb(state, error);
  }

  /** Debe llamarse dentro de un gesto del usuario (click/toque). */
  async start(config: TunerConfig): Promise<boolean> {
    this.config = config;

    if (!window.isSecureContext) {
      this.setState('error', { kind: 'insecure' });
      return false;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      this.setState('unavailable', { kind: 'notfound' });
      return false;
    }

    // Detectar permiso bloqueado de antemano (donde exista la API)
    try {
      const status = await navigator.permissions?.query({
        name: 'microphone' as PermissionName,
      });
      if (status?.state === 'denied') {
        this.setState('denied', { kind: 'blocked' });
        return false;
      }
    } catch {
      // permissions API no disponible: seguir con el flujo normal
    }

    this.setState('requesting');

    // AudioContext creado y reanudado de forma SÍNCRONA dentro del gesto
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    void this.ctx.resume();

    let stream: MediaStream;
    try {
      stream = await requestMic();
    } catch (err) {
      this.handleGetUserMediaError(err);
      return false;
    }

    try {
      await this.setupGraph(stream, config);
    } catch (err) {
      stream.getTracks().forEach((t) => t.stop());
      this.setState('error', {
        kind: 'unknown',
        message: err instanceof Error ? err.message : String(err),
      });
      return false;
    }

    this.stream = stream;
    this.wireTrackEvents(stream);
    this.wireLifecycle();
    this.setState('running');
    return true;
  }

  private async setupGraph(
    stream: MediaStream,
    config: TunerConfig,
  ): Promise<void> {
    const ctx = this.ctx!;
    this.teardownGraph();

    // Worker de DSP
    this.worker = new Worker(new URL('./tuner.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.worker.onmessage = (e: MessageEvent<WorkerToMain>) => {
      for (const cb of this.readingListeners) cb(e.data);
    };

    const channel = new MessageChannel();
    const initMsg: MainToWorker = {
      type: 'init',
      sampleRate: ctx.sampleRate,
      port: channel.port2,
      config,
    };
    this.worker.postMessage(initMsg, [channel.port2]);

    this.source = ctx.createMediaStreamSource(stream);

    if (ctx.audioWorklet) {
      await ctx.audioWorklet.addModule(workletUrl);
      this.workletNode = new AudioWorkletNode(ctx, 'tuna-capture');
      this.workletNode.port.postMessage({ type: 'port', port: channel.port1 }, [
        channel.port1,
      ]);
      // Safari exige un nodo conectado a destination para procesar
      this.muteGain = ctx.createGain();
      this.muteGain.gain.value = 0;
      this.source.connect(this.workletNode);
      this.workletNode.connect(this.muteGain);
      this.muteGain.connect(ctx.destination);
    } else {
      // Fallback: ScriptProcessorNode (deprecated pero funcional)
      const node = ctx.createScriptProcessor(1024, 1, 1);
      const port = channel.port1;
      node.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const samples = new Float32Array(input);
        port.postMessage({ type: 'chunk', samples }, [samples.buffer]);
      };
      this.muteGain = ctx.createGain();
      this.muteGain.gain.value = 0;
      this.source.connect(node);
      node.connect(this.muteGain);
      this.muteGain.connect(ctx.destination);
      this.fallbackNode = node;
    }

    if (ctx.state !== 'running') {
      await ctx.resume();
    }
  }

  private handleGetUserMediaError(err: unknown): void {
    const name = err instanceof DOMException ? err.name : '';
    if (name === 'NotAllowedError') {
      this.setState('denied', { kind: 'denied' });
    } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      this.setState('unavailable', { kind: 'notfound' });
    } else if (name === 'NotReadableError') {
      this.setState('unavailable', { kind: 'busy' });
    } else if (name === 'SecurityError') {
      this.setState('error', { kind: 'insecure' });
    } else {
      this.setState('error', {
        kind: 'unknown',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private wireTrackEvents(stream: MediaStream): void {
    for (const track of stream.getTracks()) {
      track.onended = () => {
        if (this.state === 'running') {
          this.suspendCapture();
          this.setState('awaitingGesture');
        }
      };
    }
  }

  private wireLifecycle(): void {
    if (this.visibilityHandler) return;
    this.visibilityHandler = () => {
      if (document.hidden) {
        if (this.state === 'running') {
          this.wasRunningBeforeHidden = true;
          this.suspendCapture();
          this.setState('suspended');
        }
      } else if (this.wasRunningBeforeHidden && this.state === 'suspended') {
        this.wasRunningBeforeHidden = false;
        void this.resumeCapture();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  /** Libera el micrófono (segundo plano): apaga el indicador del sistema. */
  private suspendCapture(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  /** Reintento al volver a primer plano. */
  private async resumeCapture(): Promise<void> {
    if (!this.config) return;
    this.setState('requesting');
    try {
      const stream = await requestMic();
      // Reusar el grafo: solo reemplazar el source
      if (this.ctx && this.worker) {
        this.stream = stream;
        this.source?.disconnect();
        this.source = this.ctx.createMediaStreamSource(stream);
        if (this.workletNode) this.source.connect(this.workletNode);
        if (this.fallbackNode) this.source.connect(this.fallbackNode);
        this.wireTrackEvents(stream);
      }
      if (this.ctx && this.ctx.state !== 'running') {
        // iOS: reanudar puede exigir gesto del usuario
        try {
          await this.ctx.resume();
        } catch {
          this.setState('awaitingGesture');
          return;
        }
        if ((this.ctx.state as AudioContextState) !== 'running') {
          this.setState('awaitingGesture');
          return;
        }
      }
      this.setState('running');
    } catch (err) {
      this.handleGetUserMediaError(err);
    }
  }

  /** Llamado desde un gesto cuando el estado es awaitingGesture. */
  async resumeFromGesture(): Promise<void> {
    if (!this.ctx) return;
    try {
      await this.ctx.resume();
    } catch {
      /* ignorar */
    }
    if (this.ctx.state === 'running') {
      if (!this.stream) {
        await this.resumeCapture();
      } else {
        this.setState('running');
      }
    }
  }

  setConfig(config: TunerConfig): void {
    this.config = config;
    this.worker?.postMessage({ type: 'config', config } satisfies MainToWorker);
  }

  async stop(): Promise<void> {
    this.suspendCapture();
    this.teardownGraph();
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    this.wasRunningBeforeHidden = false;
    if (this.ctx) {
      try {
        await this.ctx.close();
      } catch {
        /* ya cerrado */
      }
      this.ctx = null;
    }
    this.setState('idle');
  }

  private teardownGraph(): void {
    this.source?.disconnect();
    this.workletNode?.disconnect();
    this.fallbackNode?.disconnect();
    this.muteGain?.disconnect();
    this.source = null;
    this.workletNode = null;
    this.fallbackNode = null;
    this.muteGain = null;
    this.worker?.terminate();
    this.worker = null;
  }
}

/** Singleton de la app. */
export const audioEngine = new AudioEngine();
