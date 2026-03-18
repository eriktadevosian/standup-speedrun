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
        <input type="text" [value]="name()" (input)="name.set($any($event.target).value)" placeholder="Введи имя..." maxlength="20"
               (keydown.enter)="join()" autofocus />
        <button class="primary" (click)="join()" [disabled]="!name().trim() || loading()">
          {{ loading() ? 'ПОДКЛЮЧЕНИЕ...' : 'ИГРАТЬ' }}
        </button>
      </div>
      @if (error()) {
        <div class="error">{{ error() }}</div>
      }
    </div>
  `,
  styles: [`
    .join-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; gap: 32px; }
    .title { font-family: 'Press Start 2P', monospace; font-size: 24px; text-align: center; color: #2ecc71; line-height: 1.8; }
    .form { display: flex; flex-direction: column; gap: 16px; width: 280px; }
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
  loading = signal(false);
  error = signal('');

  async join(): Promise<void> {
    const playerName = this.name().trim();
    if (!playerName || this.loading()) return;

    this.loading.set(true);
    this.error.set('');

    try {
      const res = await firstValueFrom(
        this.http.post<{ sessionId: string }>(`${this.config.apiUrl}/api/sessions`, {})
      );

      this.playerService.playerName.set(playerName);
      this.playerService.sessionId.set(res.sessionId);
      this.playerService.save();

      this.ws.connect(res.sessionId, playerName);

      await new Promise<void>((resolve, reject) => {
        const check = setInterval(() => {
          if (this.ws.connectionState() === 'connected') {
            clearInterval(check);
            resolve();
          }
        }, 100);
        setTimeout(() => { clearInterval(check); reject(new Error('timeout')); }, 5000);
      });

      const sub = this.ws.messages$.subscribe(msg => {
        if (msg.type === 'lobby_update') {
          const me = msg.payload.players.find(p => p.name === playerName);
          if (me) {
            this.playerService.playerId.set(me.id);
            this.playerService.save();
          }
          sub.unsubscribe();
        }
      });

      this.router.navigate(['/lobby']);
    } catch {
      this.error.set('Не удалось подключиться');
      this.loading.set(false);
    }
  }
}
