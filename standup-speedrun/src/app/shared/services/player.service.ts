import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PlayerService {
  playerId = signal<string | null>(null);
  playerName = signal<string | null>(null);
  isHost = signal<boolean>(false);
  sessionId = signal<string | null>(null);

  save(): void {
    const data = {
      playerId: this.playerId(),
      playerName: this.playerName(),
      sessionId: this.sessionId(),
    };
    sessionStorage.setItem('player', JSON.stringify(data));
  }

  restore(): boolean {
    const raw = sessionStorage.getItem('player');
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      this.playerId.set(data.playerId);
      this.playerName.set(data.playerName);
      this.sessionId.set(data.sessionId);
      return !!data.sessionId;
    } catch {
      return false;
    }
  }

  clear(): void {
    this.playerId.set(null);
    this.playerName.set(null);
    this.isHost.set(false);
    this.sessionId.set(null);
    sessionStorage.removeItem('player');
  }
}
