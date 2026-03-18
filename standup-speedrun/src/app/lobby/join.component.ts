import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PlayerService } from '../shared/services/player.service';
import { WebSocketService } from '../shared/services/websocket.service';
import { ConfigService } from '../shared/services/config.service';

@Component({
  selector: 'app-join',
  standalone: true,
  template: `
    <div class="join-screen">
      <h1 class="title">STANDUP<br>SPEEDRUN</h1>

      <div class="form">
        <input type="text" [value]="name()" (input)="name.set($any($event.target).value)"
               placeholder="Введи имя..." maxlength="20" autofocus />

        @if (!showJoinByCode()) {
          <button class="primary" (click)="createGame()" [disabled]="!name().trim() || loading()">
            {{ loading() ? 'СОЗДАНИЕ...' : 'СОЗДАТЬ ИГРУ' }}
          </button>
          <button (click)="showJoinByCode.set(true)" [disabled]="loading()">
            ВОЙТИ ПО КОДУ
          </button>
        } @else {
          <input type="text" [value]="code()" (input)="code.set($any($event.target).value.toUpperCase())"
                 placeholder="Код игры (XK4B2R)" maxlength="10" />
          <button class="primary" (click)="joinByCode()" [disabled]="!name().trim() || !code().trim() || loading()">
            {{ loading() ? 'ПОДКЛЮЧЕНИЕ...' : 'ВОЙТИ' }}
          </button>
          <button (click)="showJoinByCode.set(false)" [disabled]="loading()">
            НАЗАД
          </button>
        }
      </div>

      @if (error()) {
        <div class="error">{{ error() }}</div>
      }
    </div>
  `,
  styles: [`
    .join-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; gap: 32px; }
    .title { font-family: 'Press Start 2P', monospace; font-size: 24px; text-align: center; color: #2ecc71; line-height: 1.8; }
    .form { display: flex; flex-direction: column; gap: 12px; width: 280px; }
    .error { color: #e74c3c; font-family: 'Press Start 2P', monospace; font-size: 10px; }
  `],
})
export class JoinComponent {
  private router = inject(Router);
  private http = inject(HttpClient);
  private playerService = inject(PlayerService);
  private ws = inject(WebSocketService);
  private config = inject(ConfigService);

  name = signal('');
  code = signal('');
  loading = signal(false);
  error = signal('');
  showJoinByCode = signal(false);

  async createGame(): Promise<void> {
    const playerName = this.name().trim();
    if (!playerName || this.loading()) return;

    this.loading.set(true);
    this.error.set('');

    try {
      const res = await firstValueFrom(
        this.http.post<{ sessionId: string; code: string }>(`${this.config.apiUrl}/sessions`, {})
      );

      this.playerService.sessionId.set(res.sessionId);
      this.playerService.sessionCode.set(res.code);
      await this.connectWs(res.sessionId, playerName);
    } catch {
      this.error.set('Не удалось создать игру');
      this.loading.set(false);
    }
  }

  async joinByCode(): Promise<void> {
    const playerName = this.name().trim();
    const gameCode = this.code().trim();
    if (!playerName || !gameCode || this.loading()) return;

    this.loading.set(true);
    this.error.set('');

    try {
      const res = await firstValueFrom(
        this.http.get<{ sessionId: string; code: string }>(`${this.config.apiUrl}/sessions/${gameCode}`)
      );

      this.playerService.sessionId.set(res.sessionId);
      this.playerService.sessionCode.set(res.code);
      await this.connectWs(res.sessionId, playerName);
    } catch {
      this.error.set('Игра не найдена');
      this.loading.set(false);
    }
  }

  private async connectWs(sessionId: string, playerName: string): Promise<void> {
    this.playerService.playerName.set(playerName);
    this.playerService.save();

    const connected = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => { sub.unsubscribe(); reject(new Error('timeout')); }, 5000);
      const sub = this.ws.messages$.subscribe(msg => {
        if (msg.type === 'lobby_update') {
          const me = (msg.payload as any).players?.find((p: any) => p.name === playerName);
          if (me) {
            this.playerService.playerId.set(me.id);
            this.playerService.isHost.set(me.isHost);
            this.playerService.save();
          }
          clearTimeout(timeout);
          sub.unsubscribe();
          resolve();
        }
      });
    });

    this.ws.connect(sessionId, playerName);
    await connected;
    this.router.navigate(['/lobby']);
  }
}
