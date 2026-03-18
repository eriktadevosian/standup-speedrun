import { Component, inject, signal } from '@angular/core';
import { WebSocketService } from '../shared/services/websocket.service';
import { GameStateService } from '../shared/services/game-state.service';

@Component({
  selector: 'app-host-panel',
  standalone: true,
  template: `
    <div class="host-panel">
      @if (gameState.gamePhase() === 'lobby') {
        <input type="text" [value]="context()" (input)="context.set($any($event.target).value)" placeholder="IT команда разработчиков" />
        <button (click)="generate()">СГЕНЕРИРОВАТЬ ВОПРОСЫ</button>
      }
      @if (gameState.gamePhase() === 'waiting') {
        <div class="loading">ГЕНЕРАЦИЯ ВОПРОСОВ<span class="dots">...</span></div>
      }
      @if (gameState.gamePhase() === 'ready') {
        <button class="primary" (click)="start()">НАЧАТЬ ИГРУ</button>
      }
    </div>
  `,
  styles: [`
    .host-panel { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
    .loading { color: #f1c40f; font-family: 'Press Start 2P', monospace; font-size: 10px; }
    @keyframes blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
    .dots { animation: blink 1s infinite; }
  `],
})
export class HostPanelComponent {
  private ws = inject(WebSocketService);
  gameState = inject(GameStateService);
  context = signal('');

  generate(): void {
    this.gameState.gamePhase.set('waiting');
    this.ws.send({ type: 'generate', payload: { context: this.context() || 'IT команда разработчиков' } });
  }

  start(): void {
    this.ws.send({ type: 'start', payload: {} as Record<string, never> });
  }
}
