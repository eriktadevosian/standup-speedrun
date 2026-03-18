import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GameStateService } from '../shared/services/game-state.service';
import { ConfettiComponent } from './confetti.component';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [ConfettiComponent],
  template: `
    @if (gameState.finalResults().length) {
      <app-confetti />
    }
    <div class="results">
      <h1>РЕЗУЛЬТАТЫ</h1>
      <div class="table">
        @for (player of gameState.finalResults(); track player.id) {
          <div class="row" [class.winner]="player.place === 1">
            <span class="place">#{{ player.place }}</span>
            <span class="name">{{ player.name }}</span>
            <span class="title">{{ player.title }}</span>
            <span class="score">{{ player.score }}</span>
          </div>
        }
      </div>
      <button class="primary" (click)="playAgain()">ИГРАТЬ СНОВА</button>
    </div>
  `,
  styles: [`
    .results { display: flex; flex-direction: column; align-items: center; padding: 32px; gap: 24px; height: 100vh; }
    h1 { font-family: 'Press Start 2P', monospace; font-size: 18px; color: #f1c40f; }
    .table { width: 100%; max-width: 500px; display: flex; flex-direction: column; gap: 8px; }
    .row { display: grid; grid-template-columns: 40px 1fr 1fr 60px; gap: 8px; padding: 10px; background: #16213e; border: 2px solid #888; font-family: 'Press Start 2P', monospace; font-size: 9px; align-items: center; }
    .winner { border-color: #f1c40f; background: #0f3460; }
    .place { color: #f1c40f; }
    .title { color: #3498db; font-size: 8px; }
    .score { text-align: right; color: #2ecc71; }
  `],
})
export class ResultsComponent {
  gameState = inject(GameStateService);
  private router = inject(Router);

  playAgain(): void {
    this.gameState.reset();
    this.router.navigate(['/lobby']);
  }
}
