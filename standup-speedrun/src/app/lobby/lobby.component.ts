import { Component, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { GameStateService } from '../shared/services/game-state.service';
import { PlayerService } from '../shared/services/player.service';
import { HostPanelComponent } from './host-panel.component';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [HostPanelComponent],
  template: `
    <div class="lobby">
      <h2>ЛОББИ</h2>
      @if (playerService.sessionCode()) {
        <div class="code-display">
          <div class="code-label">КОД ИГРЫ:</div>
          <div class="code-value">{{ playerService.sessionCode() }}</div>
        </div>
      }
      <div class="players">
        @for (player of gameState.players(); track player.id) {
          <div class="player" [class.host]="player.isHost">
            {{ player.isHost ? '👑' : '👤' }} {{ player.name }}
          </div>
        }
      </div>
      <div class="count">{{ gameState.players().length }} / 10</div>

      @if (playerService.isHost()) {
        <app-host-panel />
      } @else {
        <div class="waiting">ЖДЁМ НАЧАЛА ИГРЫ...</div>
      }
    </div>
  `,
  styles: [`
    .lobby { display: flex; flex-direction: column; align-items: center; padding: 32px; gap: 16px; height: 100vh; }
    h2 { font-family: 'Press Start 2P', monospace; font-size: 16px; color: #2ecc71; }
    .players { display: flex; flex-direction: column; gap: 8px; width: 280px; }
    .player { padding: 8px 12px; background: #16213e; border: 2px solid #888; font-family: 'Press Start 2P', monospace; font-size: 10px; }
    .player.host { border-color: #f1c40f; }
    .code-display { text-align: center; margin-bottom: 8px; }
    .code-label { color: #888; font-family: 'Press Start 2P', monospace; font-size: 8px; margin-bottom: 4px; }
    .code-value { color: #f1c40f; font-family: 'Press Start 2P', monospace; font-size: 24px; letter-spacing: 4px; }
    .count { color: #888; font-family: 'Press Start 2P', monospace; font-size: 10px; }
    @keyframes blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
    .waiting { color: #888; font-family: 'Press Start 2P', monospace; font-size: 10px; animation: blink 2s infinite; }
  `],
})
export class LobbyComponent {
  gameState = inject(GameStateService);
  playerService = inject(PlayerService);
  private router = inject(Router);

  constructor() {
    effect(() => {
      if (this.gameState.gamePhase() === 'playing') {
        this.router.navigate(['/play']);
      }
    });
  }
}
