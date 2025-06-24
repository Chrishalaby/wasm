import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { AudioVisualizationData } from '../services/audio.service';

@Component({
  selector: 'app-audio-visualizer',
  standalone: true,
  template: `
    <div class="visualizer-container">
      <canvas
        #waveformCanvas
        class="visualizer-canvas"
        width="800"
        height="200"
      ></canvas>
      <canvas
        #spectrumCanvas
        class="visualizer-canvas"
        width="800"
        height="200"
      ></canvas>
    </div>
  `,
  styleUrls: ['./audio-visualizer.component.scss'],
})
export class AudioVisualizerComponent implements OnChanges {
  @ViewChild('waveformCanvas', { static: true })
  waveformCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('spectrumCanvas', { static: true })
  spectrumCanvas!: ElementRef<HTMLCanvasElement>;

  @Input() visualizationData: AudioVisualizationData | null = null;
  @Input() isPlaying = false;

  private waveformCtx!: CanvasRenderingContext2D;
  private spectrumCtx!: CanvasRenderingContext2D;

  ngAfterViewInit() {
    this.waveformCtx = this.waveformCanvas.nativeElement.getContext('2d')!;
    this.spectrumCtx = this.spectrumCanvas.nativeElement.getContext('2d')!;
    this.setupCanvases();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visualizationData'] && this.visualizationData) {
      this.updateVisualization();
    }

    if (changes['isPlaying'] && !this.isPlaying) {
      this.clearVisualization();
    }
  }

  private setupCanvases() {
    const waveformCanvas = this.waveformCanvas.nativeElement;
    const spectrumCanvas = this.spectrumCanvas.nativeElement;

    // Set canvas size
    waveformCanvas.width = 800;
    waveformCanvas.height = 200;
    spectrumCanvas.width = 800;
    spectrumCanvas.height = 200;

    // Configure contexts
    this.waveformCtx.fillStyle = '#1a1a1a';
    this.waveformCtx.strokeStyle = '#00ff41';
    this.waveformCtx.lineWidth = 2;

    this.spectrumCtx.fillStyle = '#1a1a1a';
    this.spectrumCtx.strokeStyle = '#ff6b35';
    this.spectrumCtx.lineWidth = 1;

    this.clearVisualization();
  }

  private updateVisualization() {
    if (!this.visualizationData) return;

    this.drawWaveform(this.visualizationData.timeData);
    this.drawSpectrum(this.visualizationData.frequencyData);
  }

  private drawWaveform(timeData: Uint8Array) {
    const canvas = this.waveformCanvas.nativeElement;
    const ctx = this.waveformCtx;
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    this.drawGrid(ctx, width, height, '#333');

    // Draw waveform
    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const sliceWidth = width / timeData.length;
    let x = 0;

    for (let i = 0; i < timeData.length; i++) {
      const v = timeData[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();

    // Draw center line
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }

  private drawSpectrum(frequencyData: Uint8Array) {
    const canvas = this.spectrumCanvas.nativeElement;
    const ctx = this.spectrumCtx;
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    this.drawGrid(ctx, width, height, '#333');

    // Draw spectrum bars
    const barWidth = width / frequencyData.length;
    let x = 0;

    for (let i = 0; i < frequencyData.length; i++) {
      const barHeight = (frequencyData[i] / 255) * height;

      // Create gradient for bars
      const gradient = ctx.createLinearGradient(
        0,
        height - barHeight,
        0,
        height
      );
      gradient.addColorStop(0, '#ff6b35');
      gradient.addColorStop(0.5, '#f7931e');
      gradient.addColorStop(1, '#ffdc00');

      ctx.fillStyle = gradient;
      ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

      x += barWidth;
    }

    // Draw frequency labels
    ctx.fillStyle = '#ccc';
    ctx.font = '12px Arial';
    ctx.fillText('0 Hz', 5, height - 5);
    ctx.fillText('~22kHz', width - 50, height - 5);
  }

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    color: string
  ) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    ctx.beginPath();

    // Horizontal lines
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }

    // Vertical lines
    for (let i = 0; i <= 8; i++) {
      const x = (width / 8) * i;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }

    ctx.stroke();
  }

  private clearVisualization() {
    if (!this.waveformCtx || !this.spectrumCtx) return;

    const waveformCanvas = this.waveformCanvas.nativeElement;
    const spectrumCanvas = this.spectrumCanvas.nativeElement;

    // Clear waveform canvas
    this.waveformCtx.fillStyle = '#1a1a1a';
    this.waveformCtx.fillRect(
      0,
      0,
      waveformCanvas.width,
      waveformCanvas.height
    );
    this.drawGrid(
      this.waveformCtx,
      waveformCanvas.width,
      waveformCanvas.height,
      '#333'
    );

    // Clear spectrum canvas
    this.spectrumCtx.fillStyle = '#1a1a1a';
    this.spectrumCtx.fillRect(
      0,
      0,
      spectrumCanvas.width,
      spectrumCanvas.height
    );
    this.drawGrid(
      this.spectrumCtx,
      spectrumCanvas.width,
      spectrumCanvas.height,
      '#333'
    );

    // Add labels
    this.waveformCtx.fillStyle = '#ccc';
    this.waveformCtx.font = '14px Arial';
    this.waveformCtx.fillText('Waveform (Time Domain)', 10, 25);

    this.spectrumCtx.fillStyle = '#ccc';
    this.spectrumCtx.font = '14px Arial';
    this.spectrumCtx.fillText('Frequency Spectrum', 10, 25);
  }
}
