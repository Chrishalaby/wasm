import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AudioVisualizationData {
  timeData: Uint8Array;
  frequencyData: Uint8Array;
}

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  private audioContext: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private worker: Worker | null = null;
  private wasmModule: ArrayBuffer | null = null;

  private isPlayingSubject = new BehaviorSubject<boolean>(false);
  private currentGainSubject = new BehaviorSubject<number>(0.5);
  private currentFrequencySubject = new BehaviorSubject<number>(440);
  private visualizationDataSubject =
    new BehaviorSubject<AudioVisualizationData | null>(null);
  private processingModeSubject = new BehaviorSubject<
    'javascript' | 'webassembly'
  >('javascript');

  public isPlaying$ = this.isPlayingSubject.asObservable();
  public currentGain$ = this.currentGainSubject.asObservable();
  public currentFrequency$ = this.currentFrequencySubject.asObservable();
  public visualizationData$ = this.visualizationDataSubject.asObservable();
  public processingMode$ = this.processingModeSubject.asObservable();

  constructor() {
    this.initializeAudioContext();
    this.initializeWorker();
    this.loadWasmModule();
  }

  private async initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();

      // Create audio nodes
      this.gainNode = this.audioContext.createGain();
      this.analyserNode = this.audioContext.createAnalyser();

      // Configure analyser
      this.analyserNode.fftSize = 2048;
      this.analyserNode.smoothingTimeConstant = 0.8;

      // Connect nodes
      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);

      // Set initial gain
      this.gainNode.gain.value = this.currentGainSubject.value;

      console.log('Audio context initialized');
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }

  private initializeWorker() {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(
        new URL('../workers/audio-processor.worker', import.meta.url),
        {
          type: 'module',
        }
      );

      this.worker.onmessage = (event) => {
        this.handleWorkerMessage(event.data);
      };

      this.worker.onerror = (error) => {
        console.error('Worker error:', error);
      };

      console.log('Web Worker initialized');
    } else {
      console.warn('Web Workers are not supported in this environment');
    }
  }

  private async loadWasmModule() {
    try {
      const response = await fetch('/gain-processor.wasm');
      this.wasmModule = await response.arrayBuffer();

      if (this.worker && this.wasmModule) {
        this.worker.postMessage({
          type: 'INIT_WASM',
          data: { wasmModule: this.wasmModule },
        });
      }

      console.log('WebAssembly module loaded');
    } catch (error) {
      console.error('Failed to load WebAssembly module:', error);
    }
  }

  private handleWorkerMessage(message: any) {
    switch (message.type) {
      case 'WASM_INITIALIZED':
        if (message.success) {
          this.processingModeSubject.next('webassembly');
          console.log('WebAssembly initialized in worker');
        } else {
          console.error('Failed to initialize WebAssembly:', message.error);
        }
        break;

      case 'AUDIO_GENERATED':
        if (message.data?.audioData) {
          this.playGeneratedAudio(message.data.audioData);
        }
        break;

      case 'AUDIO_PROCESSED':
        if (message.data?.processedAudio) {
          this.playProcessedAudio(message.data.processedAudio);
        }
        break;

      case 'ERROR':
        console.error('Worker error:', message.error);
        break;
    }
  }

  private playGeneratedAudio(audioData: Float32Array) {
    if (!this.audioContext || !this.gainNode) return;

    const audioBuffer = this.audioContext.createBuffer(
      1,
      audioData.length,
      this.audioContext.sampleRate
    );
    audioBuffer.copyToChannel(audioData, 0);

    this.stopCurrentPlayback();

    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = audioBuffer;
    this.sourceNode.connect(this.gainNode);

    this.sourceNode.onended = () => {
      this.isPlayingSubject.next(false);
    };

    this.sourceNode.start();
    this.isPlayingSubject.next(true);

    this.startVisualization();
  }

  private playProcessedAudio(audioData: Float32Array) {
    // Similar to playGeneratedAudio but for processed audio
    this.playGeneratedAudio(audioData);
  }

  private stopCurrentPlayback() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch (error) {
        // Ignore errors when stopping already stopped nodes
      }
      this.sourceNode = null;
    }
    this.isPlayingSubject.next(false);
  }

  private startVisualization() {
    if (!this.analyserNode) return;

    const timeData = new Uint8Array(this.analyserNode.frequencyBinCount);
    const frequencyData = new Uint8Array(this.analyserNode.frequencyBinCount);

    const updateVisualization = () => {
      if (this.isPlayingSubject.value && this.analyserNode) {
        this.analyserNode.getByteTimeDomainData(timeData);
        this.analyserNode.getByteFrequencyData(frequencyData);

        this.visualizationDataSubject.next({
          timeData: new Uint8Array(timeData),
          frequencyData: new Uint8Array(frequencyData),
        });

        requestAnimationFrame(updateVisualization);
      }
    };

    updateVisualization();
  }

  // Public methods
  async resumeAudioContext() {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  generateTone(frequency: number) {
    this.currentFrequencySubject.next(frequency);

    if (!this.worker) {
      console.error('Worker not available');
      return;
    }

    const sampleRate = this.audioContext?.sampleRate || 44100;
    const duration = 2; // 2 seconds
    const length = Math.floor(sampleRate * duration);

    this.worker.postMessage({
      type: 'GENERATE_AUDIO',
      data: {
        frequency,
        sampleRate,
        length,
      },
    });
  }

  processAudioData(audioData: Float32Array, gain: number) {
    if (!this.worker) {
      console.error('Worker not available');
      return;
    }

    this.worker.postMessage({
      type: 'PROCESS_AUDIO',
      data: {
        audioData,
        gain,
      },
    });
  }

  setGain(gain: number) {
    this.currentGainSubject.next(gain);
    if (this.gainNode) {
      this.gainNode.gain.value = gain;
    }
  }

  setFrequency(frequency: number) {
    this.currentFrequencySubject.next(frequency);
  }

  stopPlayback() {
    this.stopCurrentPlayback();
  }

  getCurrentGain(): number {
    return this.currentGainSubject.value;
  }

  getCurrentFrequency(): number {
    return this.currentFrequencySubject.value;
  }

  getProcessingMode(): 'javascript' | 'webassembly' {
    return this.processingModeSubject.value;
  }

  ngOnDestroy() {
    this.stopCurrentPlayback();
    if (this.worker) {
      this.worker.terminate();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
