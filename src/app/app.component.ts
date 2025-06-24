import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AudioControlsComponent } from './components/audio-controls.component';
import { AudioVisualizerComponent } from './components/audio-visualizer.component';
import { AudioService, AudioVisualizationData } from './services/audio.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, AudioControlsComponent, AudioVisualizerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  title = 'WebAssembly Audio Processing Demo';
  visualizationData: AudioVisualizationData | null = null;
  isPlaying = false;

  constructor(private audioService: AudioService) {}

  ngOnInit() {
    this.audioService.visualizationData$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => (this.visualizationData = data));

    this.audioService.isPlaying$
      .pipe(takeUntil(this.destroy$))
      .subscribe((playing) => (this.isPlaying = playing));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
