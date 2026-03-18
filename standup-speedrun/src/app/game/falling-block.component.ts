import { Component, input, computed } from '@angular/core';
import { PixelSprite } from '../shared/sprites/pixel-sprites';
import { AttackEffect } from '../shared/models/attack.model';

@Component({
  selector: 'app-falling-block',
  standalone: true,
  template: `
    <div class="block-container" [style.top.%]="position()">
      <div class="block" [class.hidden]="isHidden()" [class.partial]="isPartial()">
        @if (sprite()) {
          <div class="sprite">
            @for (row of sprite()!.grid; track $index) {
              <div class="sprite-row">
                @for (cell of row; track $index) {
                  <div class="pixel"
                    [style.background]="cell === 0 ? 'transparent' : cell === 2 ? (sprite()!.color + '88') : sprite()!.color">
                  </div>
                }
              </div>
            }
          </div>
        }
        <div class="question">{{ displayQuestion() }}</div>
      </div>
    </div>
  `,
  styles: [`
    .block-container {
      transition: top 100ms linear;
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      width: 80%;
      max-width: 300px;
    }
    .block {
      display: flex;
      align-items: center;
      gap: 12px;
      border: 3px solid #2ecc71;
      background: #16213e;
      padding: 12px;
    }
    .sprite-row { display: flex; }
    .pixel { width: 8px; height: 8px; }
    .question {
      font-family: 'Press Start 2P', monospace;
      font-size: 9px;
      line-height: 1.6;
      color: #2ecc71;
    }
    .hidden { opacity: 0; }
    .partial .question {
      color: transparent;
      text-shadow: 0 0 8px #2ecc71;
    }
  `],
})
export class FallingBlockComponent {
  question = input<string | null>(null);
  position = input<number>(0);
  sprite = input<PixelSprite | null>(null);
  effects = input<AttackEffect[]>([]);

  isHidden = computed(() => this.effects().some(e => e.attackType === 'hide_all'));
  isPartial = computed(() => this.effects().some(e => e.attackType === 'hide_part'));

  displayQuestion = computed(() => {
    const q = this.question();
    if (!q) return '';
    if (this.isPartial()) {
      return q.split('').map((c, i) => i % 2 === 0 ? '\u2591' : c).join('');
    }
    return q;
  });
}
