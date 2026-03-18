import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-timer',
  standalone: true,
  template: `
    <div class="timer" [class.urgent]="secondsLeft() <= 10">
      &#9201; {{ display() }}
    </div>
  `,
  styles: [`
    .timer { font-family: 'Press Start 2P', monospace; font-size: 12px; }
    .urgent { color: #e74c3c; animation: blink 1s infinite; }
    @keyframes blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
  `],
})
export class TimerComponent {
  secondsLeft = input.required<number>();
  display = computed(() => {
    const m = Math.floor(this.secondsLeft() / 60);
    const s = this.secondsLeft() % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  });
}
