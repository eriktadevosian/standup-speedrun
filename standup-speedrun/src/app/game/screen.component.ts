import { Component, inject, signal, effect, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { GameStateService } from '../shared/services/game-state.service';
import { WebSocketService } from '../shared/services/websocket.service';
import { ConfigService } from '../shared/services/config.service';
import { FallingBlockComponent } from './falling-block.component';
import { EnergyBarComponent } from './energy-bar.component';
import { TimerComponent } from './timer.component';
import { ScoreboardComponent } from './scoreboard.component';
import { getRandomSprite, PixelSprite } from '../shared/sprites/pixel-sprites';

@Component({
  selector: 'app-screen',
  standalone: true,
  imports: [FallingBlockComponent, EnergyBarComponent, TimerComponent, ScoreboardComponent],
  template: `
    <div class="screen">
      <div class="top-bar">
        <h1>STANDUP SPEEDRUN</h1>
        <app-timer [secondsLeft]="gameState.timer()" />
      </div>
      <div class="main">
        <div class="game-area">
          @if (gameState.gamePhase() === 'playing') {
            <app-falling-block
              [question]="gameState.currentQuestion()"
              [position]="gameState.blockPosition()"
              [sprite]="currentSprite()"
              [effects]="gameState.activeEffects()" />
            <div class="ground">▲ ДНО ▲</div>
          } @else {
            <div class="waiting-label">
              @if (error()) {
                <span style="color:#e74c3c">{{ error() }}</span>
              } @else @switch (gameState.gamePhase()) {
                @case ('join') { ОЖИДАНИЕ ПОДКЛЮЧЕНИЯ... }
                @case ('lobby') { ОЖИДАНИЕ ИГРОКОВ... }
                @case ('waiting') { ГЕНЕРАЦИЯ ВОПРОСОВ... }
                @case ('ready') { ГОТОВО К СТАРТУ }
                @case ('results') { ИГРА ЗАВЕРШЕНА }
              }
            </div>
          }
        </div>
        <div class="sidebar">
          <h3>ИГРОКИ</h3>
          <app-scoreboard [players]="gameState.scores()" [activePlayerId]="gameState.activePlayerId()" />
          <h3>ЭНЕРГИЯ</h3>
          <app-energy-bar [energy]="gameState.energyPool()" />
        </div>
      </div>
    </div>
  `,
  styles: [`
    .screen { height: 100vh; display: flex; flex-direction: column; padding: 24px; background: #1a1a2e; }
    .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    h1 { font-family: 'Press Start 2P', monospace; font-size: 20px; color: #2ecc71; }
    .main { flex: 1; display: grid; grid-template-columns: 1fr 300px; gap: 24px; }
    .game-area { position: relative; border: 3px solid #888; overflow: hidden; }
    .ground { position: absolute; bottom: 0; width: 100%; text-align: center; border-top: 3px dashed #e74c3c; color: #e74c3c; font-family: 'Press Start 2P', monospace; font-size: 10px; padding: 8px; }
    @keyframes blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
    .waiting-label { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); font-family: 'Press Start 2P', monospace; font-size: 14px; color: #888; animation: blink 2s infinite; }
    .sidebar { display: flex; flex-direction: column; gap: 16px; }
    h3 { font-family: 'Press Start 2P', monospace; font-size: 12px; color: #f1c40f; margin: 0; }
  `],
})
export class ScreenComponent implements OnInit {
  gameState = inject(GameStateService);
  private ws = inject(WebSocketService);
  private http = inject(HttpClient);
  private config = inject(ConfigService);
  private route = inject(ActivatedRoute);

  currentSprite = signal<PixelSprite>(getRandomSprite());
  error = signal('');

  constructor() {
    effect(() => {
      this.gameState.activePlayerId();
      this.currentSprite.set(getRandomSprite());
    });
  }

  async ngOnInit(): Promise<void> {
    const code = this.route.snapshot.queryParamMap.get('code');
    if (!code) {
      this.error.set('Добавь ?code=XXXXXX в URL');
      return;
    }

    try {
      const res = await firstValueFrom(
        this.http.get<{ sessionId: string }>(`${this.config.apiUrl}/sessions/${code}`)
      );
      this.ws.connect(res.sessionId);
    } catch {
      this.error.set('Игра не найдена');
    }
  }
}
