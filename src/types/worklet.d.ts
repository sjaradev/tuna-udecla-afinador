/**
 * Declaraciones mínimas para el ámbito del AudioWorklet (no incluidas en lib.dom).
 * El worklet no importa código de ejecución; solo usa estas firmas.
 */
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean;
}

declare function registerProcessor(
  name: string,
  processorCtor: new () => AudioWorkletProcessor,
): void;
