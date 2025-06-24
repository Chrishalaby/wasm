import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AudioService } from '../services/audio.service';

@Component({
  selector: 'app-audio-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="controls-container">
      <h3>Audio Controls</h3>

      <div class="status-section">
        <div class="status-item">
          <span class="label">Status:</span>
          <span
            class="value"
            [class.playing]="isPlaying"
            [class.stopped]="!isPlaying"
          >
            {{ isPlaying ? 'Playing' : 'Stopped' }}
          </span>
        </div>
        <div class="status-item">
          <span class="label">Processing:</span>
          <span
            class="value"
            [class.wasm]="processingMode === 'webassembly'"
            [class.js]="processingMode === 'javascript'"
          >
            {{
              processingMode === 'webassembly' ? 'WebAssembly' : 'JavaScript'
            }}
          </span>
        </div>
      </div>

      <div class="control-group">
        <label for="frequency">Frequency: {{ currentFrequency }}Hz</label>
        <input
          type="range"
          id="frequency"
          min="100"
          max="2000"
          step="10"
          [(ngModel)]="currentFrequency"
          (input)="onFrequencyChange()"
          class="slider frequency-slider"
        />
        <div class="range-labels">
          <span>100Hz</span>
          <span>2000Hz</span>
        </div>
      </div>

      <div class="control-group">
        <label for="gain">Gain: {{ (currentGain * 100).toFixed(0) }}%</label>
        <input
          type="range"
          id="gain"
          min="0"
          max="1"
          step="0.01"
          [(ngModel)]="currentGain"
          (input)="onGainChange()"
          class="slider gain-slider"
        />
        <div class="range-labels">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      <div class="button-group">
        <button
          (click)="generateTone()"
          [disabled]="isPlaying"
          class="btn btn-primary"
        >
          <span class="btn-icon">🎵</span>
          Generate Tone
        </button>

        <button
          (click)="generateProcessedTone()"
          [disabled]="isPlaying"
          class="btn btn-secondary"
        >
          <span class="btn-icon">⚙️</span>
          Process Audio
        </button>

        <button
          (click)="stopPlayback()"
          [disabled]="!isPlaying"
          class="btn btn-danger"
        >
          <span class="btn-icon">⏹️</span>
          Stop
        </button>
      </div>

      <div class="demo-section">
        <h4>Demo Presets</h4>
        <div class="preset-buttons">
          <button (click)="loadPreset('low')" class="btn btn-preset">
            Low Tone (220Hz)
          </button>
          <button (click)="loadPreset('mid')" class="btn btn-preset">
            Mid Tone (440Hz)
          </button>
          <button (click)="loadPreset('high')" class="btn btn-preset">
            High Tone (880Hz)
          </button>
        </div>
      </div>

      <div class="info-section">
        <h4>Technical Info</h4>
        <div class="tech-info">
          <div class="tech-item">
            <strong>Web Audio API:</strong> Real-time audio processing and
            visualization
          </div>
          <div class="tech-item">
            <strong>WebAssembly:</strong> High-performance audio gain processing
          </div>
          <div class="tech-item">
            <strong>Web Workers:</strong> Background audio processing without
            blocking UI
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./audio-controls.component.scss'],
})
export class AudioControlsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isPlaying = false;
  currentGain = 0.5;
  currentFrequency = 440;
  processingMode: 'javascript' | 'webassembly' = 'javascript';

  constructor(private audioService: AudioService) {}

  ngOnInit() {
    // Subscribe to audio service observables
    this.audioService.isPlaying$
      .pipe(takeUntil(this.destroy$))
      .subscribe((playing) => (this.isPlaying = playing));

    this.audioService.currentGain$
      .pipe(takeUntil(this.destroy$))
      .subscribe((gain) => (this.currentGain = gain));

    this.audioService.currentFrequency$
      .pipe(takeUntil(this.destroy$))
      .subscribe((frequency) => (this.currentFrequency = frequency));

    this.audioService.processingMode$
      .pipe(takeUntil(this.destroy$))
      .subscribe((mode) => (this.processingMode = mode));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async generateTone() {
    await this.audioService.resumeAudioContext();
    this.audioService.generateTone(this.currentFrequency);
  }

  async generateProcessedTone() {
    await this.audioService.resumeAudioContext();

    // Generate a simple tone first, then process it
    const sampleRate = 44100;
    const duration = 2;
    const length = sampleRate * duration;
    const audioData = new Float32Array(length);

    // Generate a sine wave
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      audioData[i] = Math.sin(2 * Math.PI * this.currentFrequency * t) * 0.3;
    }

    // Process with current gain
    this.audioService.processAudioData(audioData, this.currentGain);
  }

  stopPlayback() {
    this.audioService.stopPlayback();
  }

  onFrequencyChange() {
    this.audioService.setFrequency(this.currentFrequency);
  }

  onGainChange() {
    this.audioService.setGain(this.currentGain);
  }

  loadPreset(preset: 'low' | 'mid' | 'high') {
    switch (preset) {
      case 'low':
        this.currentFrequency = 220;
        this.currentGain = 0.7;
        break;
      case 'mid':
        this.currentFrequency = 440;
        this.currentGain = 0.5;
        break;
      case 'high':
        this.currentFrequency = 880;
        this.currentGain = 0.3;
        break;
    }

    this.onFrequencyChange();
    this.onGainChange();
  }
}
