import { Component, input } from '@angular/core';

@Component({
  selector: 'app-energy-bar',
  standalone: true,
  template: `
    <div class="energy-bar">
      <span class="label">&#9889;</span>
      <div class="bar">
        <div class="fill" [style.width.%]="energy()" [class.low]="energy() < 20"></div>
      </div>
      <span class="value">{{ energy() }}</span>
    </div>
  `,
  styles: [`
    .energy-bar { display: flex; align-items: center; gap: 8px; }
    .label { font-size: 14px; }
    .bar { flex: 1; height: 16px; border: 2px solid #888; background: #16213e; }
    .fill { height: 100%; background: #f1c40f; transition: width 0.3s; }
    .fill.low { background: #e74c3c; }
    .value { font-family: 'Press Start 2P', monospace; font-size: 10px; min-width: 30px; }
  `],
})
export class EnergyBarComponent {
  energy = input.required<number>();
}
