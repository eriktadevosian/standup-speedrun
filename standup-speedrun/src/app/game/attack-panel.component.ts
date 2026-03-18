import { Component, input, output } from '@angular/core';
import { ATTACKS, AttackType } from '../shared/models/attack.model';

@Component({
  selector: 'app-attack-panel',
  standalone: true,
  template: `
    <div class="attacks">
      @for (attack of attacks; track attack.type) {
        <button class="attack-btn"
                [disabled]="energy() < attack.cost || isMyTurn()"
                (click)="attackSelected.emit(attack.type)">
          <span class="icon">{{ attack.icon }}</span>
          <span class="cost">{{ attack.cost }}⚡</span>
        </button>
      }
    </div>
  `,
  styles: [`
    .attacks { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .attack-btn {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 12px 8px; font-family: 'Press Start 2P', monospace; font-size: 8px;
      border: 2px solid #888; background: #16213e; color: #fff; cursor: pointer;
    }
    .attack-btn:not(:disabled):hover { border-color: #f1c40f; background: #0f3460; }
    .attack-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .icon { font-size: 20px; }
    .cost { color: #f1c40f; }
  `],
})
export class AttackPanelComponent {
  energy = input.required<number>();
  isMyTurn = input.required<boolean>();
  attackSelected = output<AttackType>();
  attacks = ATTACKS;
}
