import { Injectable, signal, computed, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WebSocketService } from './websocket.service';
import { PlayerService } from './player.service';
import { GamePhase } from '../models/game-state.model';
import { PlayerInfo, PlayerScore, PlayerResult } from '../models/player.model';
import { AttackEffect } from '../models/attack.model';

@Injectable({ providedIn: 'root' })
export class GameStateService {
  private ws = inject(WebSocketService);
  private playerService = inject(PlayerService);
  private destroyRef = inject(DestroyRef);

  gamePhase = signal<GamePhase>('join');
  players = signal<PlayerInfo[]>([]);
  playerScores = signal<PlayerScore[]>([]);
  activePlayerId = signal<string | null>(null);

  isMyTurn = computed(() => this.playerService.playerId() === this.activePlayerId());
  scores = computed(() => [...this.playerScores()].sort((a, b) => b.score - a.score));

  energyPool = signal<number>(100);
  timer = signal<number>(180);
  currentQuestion = signal<string | null>(null);
  blockPosition = signal<number>(0);
  blockDuration = signal<number>(10000);
  activeEffects = signal<AttackEffect[]>([]);

  finalResults = signal<PlayerResult[]>([]);
  lastError = signal<{ message: string; code: string } | null>(null);

  private timerInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.ws.messages$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      switch (event.type) {
        case 'lobby_update':
          this.players.set(event.payload.players);
          if ((event.payload as any).code) {
            this.playerService.sessionCode.set((event.payload as any).code);
          }
          if (this.gamePhase() === 'join') this.gamePhase.set('lobby');
          const me = event.payload.players.find(p => p.id === this.playerService.playerId());
          if (me) this.playerService.isHost.set(me.isHost);
          break;
        case 'questions_ready':
          this.gamePhase.set('ready');
          break;
        case 'game_start':
          this.gamePhase.set('playing');
          this.startTimer(event.payload.durationSeconds);
          break;
        case 'turn':
          this.activePlayerId.set(event.payload.activePlayerId);
          this.currentQuestion.set(event.payload.question);
          this.blockDuration.set(event.payload.blockDurationMs);
          this.blockPosition.set(0);
          break;
        case 'block_position':
          this.blockPosition.set(event.payload.position);
          break;
        case 'attack_applied':
          this.addEffect(event.payload);
          break;
        case 'energy_update':
          this.energyPool.set(event.payload.energy);
          break;
        case 'score_update':
          this.playerScores.set(event.payload.players);
          break;
        case 'game_over':
          this.gamePhase.set('results');
          this.finalResults.set(event.payload.players);
          this.stopTimer();
          break;
        case 'error':
          this.lastError.set(event.payload);
          setTimeout(() => this.lastError.set(null), 3000);
          break;
      }
    });
  }

  reset(): void {
    this.gamePhase.set('lobby');
    this.playerScores.set([]);
    this.activePlayerId.set(null);
    this.energyPool.set(100);
    this.timer.set(180);
    this.currentQuestion.set(null);
    this.blockPosition.set(0);
    this.activeEffects.set([]);
    this.finalResults.set([]);
    this.lastError.set(null);
    this.stopTimer();
  }

  private startTimer(seconds: number): void {
    this.timer.set(seconds);
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      const current = this.timer();
      if (current <= 0) { this.stopTimer(); return; }
      this.timer.set(current - 1);
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private addEffect(payload: { attackType: any; attackerId: string; targetId: string; durationMs: number }): void {
    const effect: AttackEffect = {
      ...payload,
      expiresAt: Date.now() + payload.durationMs,
    };
    this.activeEffects.update(effects => [...effects, effect]);
    setTimeout(() => {
      this.activeEffects.update(effects => effects.filter(e => e !== effect));
    }, payload.durationMs);
  }
}
