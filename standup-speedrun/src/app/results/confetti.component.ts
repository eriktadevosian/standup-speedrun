import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-confetti',
  standalone: true,
  template: `
    <div class="confetti-container">
      @for (p of particles; track $index) {
        <div class="confetti" [style.left.%]="getLeft($index)" [style.animation-delay.ms]="getDelay($index)">{{ p }}</div>
      }
    </div>
  `,
  styles: [`
    .confetti-container { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 100; }
    .confetti {
      position: absolute; font-size: 20px; top: -20px;
      animation: confetti-fall 3s ease-in forwards;
    }
    @keyframes confetti-fall {
      0% { top: -10%; opacity: 1; transform: rotate(0deg); }
      100% { top: 110%; opacity: 0; transform: rotate(360deg); }
    }
  `],
})
export class ConfettiComponent implements OnInit {
  particles: string[] = [];

  ngOnInit(): void {
    const emojis = ['\uD83C\uDF89', '\uD83C\uDFC6', '\u2B50', '\uD83D\uDE80', '\uD83C\uDF8A', '\u2728'];
    this.particles = Array.from({ length: 30 }, () => emojis[Math.floor(Math.random() * emojis.length)]);
  }

  getLeft(index: number): number { return (index * 3.3) % 100; }
  getDelay(index: number): number { return index * 100; }
}
