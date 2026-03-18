import { Component, inject, signal, effect, computed } from '@angular/core';
import { Router } from '@angular/router';
import { GameStateService } from '../shared/services/game-state.service';
import { PlayerService } from '../shared/services/player.service';
import { WebSocketService } from '../shared/services/websocket.service';
import { FallingBlockComponent } from './falling-block.component';
import { EnergyBarComponent } from './energy-bar.component';
import { TimerComponent } from './timer.component';
import { AttackPanelComponent } from './attack-panel.component';
import { AttackType } from '../shared/models/attack.model';
import { getRandomSprite, PixelSprite } from '../shared/sprites/pixel-sprites';

@Component({
  selector: 'app-play',
  standalone: true,
  imports: [FallingBlockComponent, EnergyBarComponent, TimerComponent, AttackPanelComponent],
  template: `
    <div class="play-screen">
      <div class="header">
        <app-timer [secondsLeft]="gameState.timer()" />
        <app-energy-bar [energy]="gameState.energyPool()" />
      </div>

      @if (gameState.isMyTurn()) {
        <div class="my-turn">
          <div class="game-field" [class.locked]="isLocked()">
            <app-falling-block
              [question]="gameState.currentQuestion()"
              [position]="gameState.blockPosition()"
              [sprite]="currentSprite()"
              [effects]="myEffects()" />
            <div class="ground">&#9650; ДНО &#9650;</div>
          </div>
          <div class="answer-form">
            @if (isLocked()) {
              <div class="locked-overlay">&#128274; ЗАБЛОКИРОВАНО</div>
            }
            <input type="text" [value]="answer()" (input)="answer.set($any($event.target).value)"
                   placeholder="Ответ..." (keydown.enter)="submitAnswer()" [disabled]="isLocked()" autofocus />
            <button class="primary" (click)="submitAnswer()" [disabled]="!answer().trim() || isLocked()">
              ОТВЕТИТЬ
            </button>
          </div>
        </div>
      } @else {
        <div class="not-my-turn">
          <div class="active-label">СЕЙЧАС ОТВЕЧАЕТ</div>
          <div class="active-name">{{ activePlayerName() }}</div>
          <app-attack-panel
            [energy]="gameState.energyPool()"
            [isMyTurn]="gameState.isMyTurn()"
            (attackSelected)="sendAttack($event)" />
        </div>
      }

      <div class="my-score">
        {{ myPlace() }} — {{ playerService.playerName() }} — {{ myScore() }} очков
      </div>
    </div>
  `,
  styles: [`
    .play-screen { display: flex; flex-direction: column; height: 100vh; padding: 16px; gap: 16px; }
    .header { display: flex; justify-content: space-between; align-items: center; }
    .my-turn { flex: 1; display: flex; flex-direction: column; gap: 12px; }
    .game-field { flex: 1; position: relative; border: 2px solid #888; overflow: hidden; }
    @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
    .game-field.locked { animation: shake 0.3s infinite; }
    .ground { position: absolute; bottom: 0; width: 100%; text-align: center; border-top: 3px dashed #e74c3c; color: #e74c3c; font-family: 'Press Start 2P', monospace; font-size: 8px; padding: 4px; }
    .answer-form { display: flex; gap: 8px; position: relative; }
    .answer-form input { flex: 1; }
    .locked-overlay { position: absolute; inset: 0; background: rgba(231,76,60,0.8); display: flex; align-items: center; justify-content: center; font-family: 'Press Start 2P', monospace; font-size: 10px; z-index: 1; color: #fff; }
    .not-my-turn { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; }
    .active-label { color: #888; font-family: 'Press Start 2P', monospace; font-size: 10px; }
    .active-name { font-family: 'Press Start 2P', monospace; font-size: 16px; color: #2ecc71; }
    .my-score { text-align: center; font-family: 'Press Start 2P', monospace; font-size: 10px; color: #888; padding: 8px; border-top: 2px solid #888; }
  `],
})
export class PlayComponent {
  gameState = inject(GameStateService);
  playerService = inject(PlayerService);
  private ws = inject(WebSocketService);
  private router = inject(Router);

  answer = signal('');
  currentSprite = signal<PixelSprite>(getRandomSprite());

  constructor() {
    effect(() => {
      this.gameState.activePlayerId();
      this.currentSprite.set(getRandomSprite());
      this.answer.set('');
    });
    effect(() => {
      if (this.gameState.gamePhase() === 'results') {
        this.router.navigate(['/results']);
      }
    });
  }

  myEffects = computed(() => this.gameState.activeEffects().filter(
    e => e.targetId === this.playerService.playerId()
  ));

  isLocked = computed(() => this.myEffects().some(e => e.attackType === 'lock_input'));

  activePlayerName = computed(() => {
    const id = this.gameState.activePlayerId();
    return this.gameState.players().find(p => p.id === id)?.name ?? '';
  });

  myScore = computed(() => this.gameState.playerScores().find(
    p => p.id === this.playerService.playerId()
  )?.score ?? 0);

  myPlace = computed(() => {
    const sorted = this.gameState.scores();
    const idx = sorted.findIndex(p => p.id === this.playerService.playerId());
    return idx >= 0 ? `#${idx + 1}` : '';
  });

  submitAnswer(): void {
    const text = this.answer().trim();
    if (!text) return;
    this.ws.send({ type: 'answer', payload: { text } });
    this.answer.set('');
  }

  sendAttack(attackType: AttackType): void {
    const targetId = this.gameState.activePlayerId();
    if (!targetId) return;
    this.ws.send({ type: 'attack', payload: { attackType, targetId } });
  }
}
