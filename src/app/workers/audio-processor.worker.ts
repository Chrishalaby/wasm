// audio-processor.worker.ts
/// <reference lib="webworker" />

interface AudioProcessingMessage {
  type: 'PROCESS_AUDIO' | 'INIT_WASM' | 'GENERATE_AUDIO';
  data?: {
    audioData?: Float32Array;
    gain?: number;
    frequency?: number;
    sampleRate?: number;
    length?: number;
    wasmModule?: ArrayBuffer;
  };
}

let wasmInstance: WebAssembly.Instance | null = null;
let wasmMemory: WebAssembly.Memory | null = null;

// Initialize WebAssembly module
async function initWasm(wasmModule: ArrayBuffer) {
  try {
    // Create shared memory that will be imported by the WebAssembly module
    // Start with 10 pages (640KB) to handle typical audio buffers
    wasmMemory = new WebAssembly.Memory({ initial: 10, maximum: 100 }); // 10-100 pages

    const imports = {
      js: {
        mem: wasmMemory,
      },
    };

    const module = await WebAssembly.compile(wasmModule);
    wasmInstance = await WebAssembly.instantiate(module, imports);

    postMessage({
      type: 'WASM_INITIALIZED',
      success: true,
    });
  } catch (error) {
    postMessage({
      type: 'WASM_INITIALIZED',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
}

// Process audio data using WebAssembly
function processAudioWithWasm(
  audioData: Float32Array,
  gain: number
): Float32Array {
  if (!wasmInstance || !wasmMemory) {
    throw new Error('WebAssembly not initialized');
  }

  const length = audioData.length;
  const requiredBytes = length * 4; // 4 bytes per float32

  // Check if we need to grow memory
  if (requiredBytes > wasmMemory.buffer.byteLength) {
    const currentPages = wasmMemory.buffer.byteLength / 65536; // 64KB per page
    const requiredPages = Math.ceil(requiredBytes / 65536);
    const pagesToGrow = requiredPages - currentPages;

    try {
      wasmMemory.grow(pagesToGrow);
      console.log(
        `Grew WebAssembly memory by ${pagesToGrow} pages to handle ${requiredBytes} bytes`
      );
    } catch (error) {
      throw new Error(`Failed to grow WebAssembly memory: ${error}`);
    }
  }

  const memoryArray = new Float32Array(wasmMemory.buffer);

  // Copy input data to WebAssembly memory
  const inputOffset = 0;
  memoryArray.set(audioData, inputOffset);

  // Call WebAssembly function - use the correct function name from the new module
  const applyGain = wasmInstance.exports['applyGain'] as Function;
  if (!applyGain) {
    throw new Error('applyGain function not found in WebAssembly module');
  }

  applyGain(inputOffset * 4, length, gain); // multiply by 4 for byte offset

  // Return processed data
  return new Float32Array(memoryArray.buffer, inputOffset * 4, length);
}

// Generate audio using JavaScript (since our WASM module only does gain processing)
function generateAudioWithWasm(
  frequency: number,
  sampleRate: number,
  length: number
): Float32Array {
  // For now, use JavaScript generation since our WASM module focuses on gain processing
  return generateAudioWithJS(frequency, sampleRate, length);
}

// Fallback JavaScript audio processing
function processAudioWithJS(
  audioData: Float32Array,
  gain: number
): Float32Array {
  const processed = new Float32Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) {
    processed[i] = audioData[i] * gain;
  }
  return processed;
}

// Generate audio with JavaScript fallback
function generateAudioWithJS(
  frequency: number,
  sampleRate: number,
  length: number
): Float32Array {
  const audioData = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    // Generate a simple sine wave
    audioData[i] = Math.sin(2 * Math.PI * frequency * t) * 0.3;
  }
  return audioData;
}

// Message handler
addEventListener(
  'message',
  async (event: MessageEvent<AudioProcessingMessage>) => {
    const { type, data } = event.data;

    try {
      switch (type) {
        case 'INIT_WASM':
          if (data?.wasmModule) {
            await initWasm(data.wasmModule);
          }
          break;

        case 'PROCESS_AUDIO':
          if (data?.audioData && data?.gain !== undefined) {
            let processedData: Float32Array;

            if (wasmInstance) {
              processedData = processAudioWithWasm(data.audioData, data.gain);
            } else {
              processedData = processAudioWithJS(data.audioData, data.gain);
            }

            postMessage({
              type: 'AUDIO_PROCESSED',
              data: { processedAudio: processedData },
            });
          }
          break;

        case 'GENERATE_AUDIO':
          if (data?.frequency && data?.sampleRate && data?.length) {
            let audioData: Float32Array;

            if (wasmInstance) {
              audioData = generateAudioWithWasm(
                data.frequency,
                data.sampleRate,
                data.length
              );
            } else {
              audioData = generateAudioWithJS(
                data.frequency,
                data.sampleRate,
                data.length
              );
            }

            postMessage({
              type: 'AUDIO_GENERATED',
              data: { audioData },
            });
          }
          break;
      }
    } catch (error) {
      postMessage({
        type: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export {};
