/**
 * AudioWorkletProcessor mínimo: acumula el canal 0 en bloques de 1024 muestras
 * y los envía al worker de DSP por un MessageChannel dedicado.
 * Sin lógica de análisis aquí: el presupuesto por bloque es ~3 ms.
 */

const CHUNK = 1024;

class CaptureProcessor extends AudioWorkletProcessor {
  private buf = new Float32Array(CHUNK);
  private idx = 0;
  private out: MessagePort | null = null;

  constructor() {
    super();
    this.port.onmessage = (e: MessageEvent) => {
      if (e.data?.type === 'port') {
        this.out = e.data.port as MessagePort;
      }
    };
  }

  process(inputs: Float32Array[][]): boolean {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const ch = input[0];
    if (!ch) return true;

    let offset = 0;
    while (offset < ch.length) {
      const n = Math.min(CHUNK - this.idx, ch.length - offset);
      this.buf.set(ch.subarray(offset, offset + n), this.idx);
      this.idx += n;
      offset += n;
      if (this.idx === CHUNK) {
        if (this.out) {
          // Float32Array nueva por chunk: el buffer se transfiere (detached)
          const samples = new Float32Array(this.buf);
          this.out.postMessage({ type: 'chunk', samples }, [samples.buffer]);
        }
        this.idx = 0;
      }
    }
    return true;
  }
}

registerProcessor('tuna-capture', CaptureProcessor);
