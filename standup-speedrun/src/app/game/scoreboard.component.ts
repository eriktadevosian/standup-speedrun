import { Component, input } from '@angular/core';
import { PlayerScore } from '../shared/models/player.model';

@Component({
  selector: 'app-scoreboard',
  standalone: true,
  template: `
    <div class="scoreboard">
      @for (player of players(); track player.id) {
        <div class="row" [class.active]="player.id === activePlayerId()">
          <span class="name">{{ player.id === activePlayerId() ? '\u25BA' : '\u00A0' }} {{ player.name }}</span>
          <span class="score">{{ player.score }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .scoreboard { display: flex; flex-direction: column; gap: 4px; }
    .row { display: flex; justify-content: space-between; padding: 6px 8px; font-family: 'Press Start 2P', monospace; font-size: 10px; }
    .active { background: #0f3460; color: #2ecc71; }
  `],
})
export class ScoreboardComponent {
  players = input.required<PlayerScore[]>();
  activePlayerId = input<string | null>(null);
}
