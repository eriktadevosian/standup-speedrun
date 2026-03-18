# Standup Speedrun Frontend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Angular 19 frontend for Standup Speedrun multiplayer browser game with mock WebSocket server for local development.

**Architecture:** Feature-based structure (lobby/, game/, results/) with shared services on Angular Signals. WebSocketService as transport, GameStateService as single source of truth, all components read signals only. Clean Pixel visual style with Press Start 2P font and pixel art sprites.

**Tech Stack:** Angular 19, RxJS, SCSS, TypeScript, Node.js (mock server), Docker + nginx

**Spec:** `docs/superpowers/specs/2026-03-18-frontend-architecture-design.md`
**API:** `API.md`

---

## Task 1: Project Scaffold + Global Styles

**Files:**
- Create: Angular project via `ng new`
- Create: `src/styles/_variables.scss`
- Create: `src/styles/_pixel-theme.scss`
- Modify: `src/styles.scss`
- Modify: `src/index.html` (Google Fonts link)
- Modify: `src/app/app.config.ts`
- Modify: `src/app/app.routes.ts`
- Modify: `angular.json` (scss config)

- [ ] **Step 1: Create Angular project**

```bash
cd /Users/erik.tadevosian/work/ai-hackaton
ng new standup-speedrun --style=scss --routing --ssr=false --skip-tests --skip-git
```

- [ ] **Step 2: Add Google Fonts link to index.html**

In `src/index.html`, add to `<head>`:
```html
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
```

- [ ] **Step 3: Create `_variables.scss`**

```scss
// Colors
$bg-primary: #1a1a2e;
$bg-secondary: #16213e;
$bg-accent: #0f3460;
$color-success: #2ecc71;
$color-danger: #e74c3c;
$color-warning: #f1c40f;
$color-info: #3498db;
$color-text: #ffffff;
$color-text-muted: #888888;

// Fonts
$font-pixel: 'Press Start 2P', monospace;
$font-mono: 'Courier New', Courier, monospace;

// Sizes
$pixel-border: 3px solid;
$border-radius: 0; // pixel = no rounded corners
```

- [ ] **Step 4: Create `_pixel-theme.scss`**

```scss
@use 'variables' as *;

* {
  box-sizing: border-box;
  image-rendering: pixelated;
}

body {
  margin: 0;
  padding: 0;
  background-color: $bg-primary;
  color: $color-text;
  font-family: $font-pixel;
  font-size: 12px;
  overflow: hidden;
  height: 100vh;
}

button {
  font-family: $font-pixel;
  cursor: pointer;
  border: $pixel-border $color-text;
  background: $bg-secondary;
  color: $color-text;
  padding: 12px 24px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: background 0.1s;

  &:hover:not(:disabled) {
    background: $bg-accent;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.primary {
    background: $color-success;
    color: $bg-primary;
    border-color: $color-success;
  }

  &.danger {
    background: $color-danger;
    color: $color-text;
    border-color: $color-danger;
  }
}

input[type="text"] {
  font-family: $font-mono;
  background: $bg-secondary;
  border: $pixel-border $color-text-muted;
  color: $color-text;
  padding: 12px;
  font-size: 14px;
  width: 100%;
  outline: none;

  &:focus {
    border-color: $color-success;
  }
}

// Animations
@keyframes flash-green {
  0% { background-color: rgba($color-success, 0.3); }
  100% { background-color: transparent; }
}

@keyframes flash-red {
  0% { background-color: rgba($color-danger, 0.3); }
  100% { background-color: transparent; }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

@keyframes blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
```

- [ ] **Step 5: Update `styles.scss`**

```scss
@use 'styles/variables';
@use 'styles/pixel-theme';
```

- [ ] **Step 6: Set up routes in `app.routes.ts`**

```typescript
import { Routes } from '@angular/router';
import { connectedGuard } from './shared/guards/connected.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./lobby/join.component').then(m => m.JoinComponent) },
  { path: 'lobby', loadComponent: () => import('./lobby/lobby.component').then(m => m.LobbyComponent), canActivate: [connectedGuard] },
  { path: 'play', loadComponent: () => import('./game/play.component').then(m => m.PlayComponent), canActivate: [connectedGuard] },
  { path: 'screen', loadComponent: () => import('./game/screen.component').then(m => m.ScreenComponent) },
  { path: 'results', loadComponent: () => import('./results/results.component').then(m => m.ResultsComponent), canActivate: [connectedGuard] },
  { path: '**', redirectTo: '' },
];
```

- [ ] **Step 7: Update `app.config.ts`**

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
  ],
};
```

- [ ] **Step 8: Update `app.component.ts`**

```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styles: [`:host { display: block; height: 100vh; }`],
})
export class AppComponent {}
```

- [ ] **Step 9: Verify project builds**

```bash
cd standup-speedrun && npx ng build
```

- [ ] **Step 10: Commit**

```bash
git init && git add -A && git commit -m "feat: scaffold Angular 19 project with pixel theme and routing"
```

---

## Task 2: Models + Config Service

**Files:**
- Create: `src/app/shared/models/player.model.ts`
- Create: `src/app/shared/models/ws-events.model.ts`
- Create: `src/app/shared/models/attack.model.ts`
- Create: `src/app/shared/services/config.service.ts`
- Create: `src/assets/config.json`
- Create: `src/app/shared/models/game-state.model.ts`

- [ ] **Step 1: Create `player.model.ts`**

```typescript
export interface PlayerInfo {
  id: string;
  name: string;
  isHost: boolean;
}

export interface PlayerScore {
  id: string;
  name: string;
  score: number;
  answersCount: number;
  missedCount: number;
}

export interface PlayerResult {
  id: string;
  name: string;
  score: number;
  title: string;
  answersCount: number;
  missedCount: number;
  energySpent: number;
  likesGiven: number;
  place: number;
}
```

- [ ] **Step 2: Create `attack.model.ts`**

```typescript
export type AttackType = 'like' | 'add_block' | 'lock_input' | 'hide_part' | 'hide_all';

export interface AttackEffect {
  attackType: AttackType;
  attackerId: string;
  targetId: string;
  durationMs: number;
  expiresAt: number;
}

export interface AttackConfig {
  type: AttackType;
  label: string;
  icon: string;
  cost: number;
}

export const ATTACKS: AttackConfig[] = [
  { type: 'like',       label: 'Лайк',     icon: '👍', cost: 5 },
  { type: 'add_block',  label: '+Блок',     icon: '💣', cost: 20 },
  { type: 'lock_input', label: 'Блок ввод', icon: '🔒', cost: 25 },
  { type: 'hide_part',  label: 'Скрыть',    icon: '🙈', cost: 15 },
  { type: 'hide_all',   label: 'Невидим',   icon: '👻', cost: 30 },
];
```

- [ ] **Step 3: Create `ws-events.model.ts`**

```typescript
import { AttackType } from './attack.model';
import { PlayerInfo, PlayerScore, PlayerResult } from './player.model';

// Client → Server
export type WsClientEvent =
  | { type: 'generate'; payload: { context: string } }
  | { type: 'start';    payload: Record<string, never> }
  | { type: 'answer';   payload: { text: string } }
  | { type: 'attack';   payload: { attackType: AttackType; targetId: string } };

// Server → Client
export type WsServerEvent =
  | { type: 'lobby_update';    payload: { players: PlayerInfo[] } }
  | { type: 'questions_ready'; payload: Record<string, never> }
  | { type: 'game_start';      payload: { endsAt: string; durationSeconds: number } }
  | { type: 'turn';            payload: { activePlayerId: string; question: string; blockDurationMs: number } }
  | { type: 'block_position';  payload: { position: number } }
  | { type: 'attack_applied';  payload: { attackType: AttackType; attackerId: string; targetId: string; durationMs: number } }
  | { type: 'energy_update';   payload: { energy: number } }
  | { type: 'score_update';    payload: { players: PlayerScore[] } }
  | { type: 'game_over';       payload: { players: PlayerResult[] } }
  | { type: 'error';           payload: { message: string; code: ErrorCode } };

export type ErrorCode =
  | 'INSUFFICIENT_ENERGY'
  | 'NOT_YOUR_TURN'
  | 'NOT_HOST'
  | 'INVALID_STATUS'
  | 'SESSION_FULL'
  | 'SESSION_NOT_FOUND';
```

- [ ] **Step 4: Create `game-state.model.ts`**

```typescript
export type GamePhase = 'join' | 'lobby' | 'waiting' | 'ready' | 'playing' | 'results';
```

- [ ] **Step 5: Create `config.service.ts`**

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AppConfig {
  apiUrl: string;
  wsUrl: string;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private config!: AppConfig;

  constructor(private http: HttpClient) {}

  async load(): Promise<void> {
    this.config = await firstValueFrom(this.http.get<AppConfig>('/assets/config.json'));
  }

  get apiUrl(): string { return this.config.apiUrl; }
  get wsUrl(): string { return this.config.wsUrl; }
}
```

- [ ] **Step 6: Create `assets/config.json`**

```json
{
  "apiUrl": "http://localhost:8080",
  "wsUrl": "ws://localhost:8080"
}
```

- [ ] **Step 7: Register APP_INITIALIZER in `app.config.ts`**

Add to providers:
```typescript
{
  provide: APP_INITIALIZER,
  useFactory: (config: ConfigService) => () => config.load(),
  deps: [ConfigService],
  multi: true,
},
```

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: add models, WS event types, and runtime config service"
```

---

## Task 3: PlayerService + WebSocketService + connectedGuard

**Files:**
- Create: `src/app/shared/services/player.service.ts`
- Create: `src/app/shared/services/websocket.service.ts`
- Create: `src/app/shared/guards/connected.guard.ts`

- [ ] **Step 1: Create `player.service.ts`**

```typescript
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
```

- [ ] **Step 2: Create `websocket.service.ts`**

```typescript
import { Injectable, signal, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { ConfigService } from './config.service';
import { WsClientEvent, WsServerEvent } from '../models/ws-events.model';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private config = inject(ConfigService);
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnects = 3;
  private buffer: WsClientEvent[] = [];
  private sessionId = '';
  private playerName?: string;

  connectionState = signal<'connecting' | 'connected' | 'disconnected'>('disconnected');

  private messagesSubject = new Subject<WsServerEvent>();
  messages$ = this.messagesSubject.asObservable();

  connect(sessionId: string, playerName?: string): void {
    this.sessionId = sessionId;
    this.playerName = playerName;
    this.reconnectAttempts = 0;
    this.doConnect();
  }

  disconnect(): void {
    this.reconnectAttempts = this.maxReconnects; // prevent reconnect
    this.ws?.close();
    this.ws = null;
    this.connectionState.set('disconnected');
  }

  send(event: WsClientEvent): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    } else {
      this.buffer.push(event);
    }
  }

  private doConnect(): void {
    this.connectionState.set('connecting');
    const nameParam = this.playerName ? `?name=${encodeURIComponent(this.playerName)}` : '?name=__screen__';
    const url = `${this.config.wsUrl}/ws/${this.sessionId}${nameParam}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.connectionState.set('connected');
      this.reconnectAttempts = 0;
      this.flushBuffer();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WsServerEvent;
        this.messagesSubject.next(data);
      } catch { /* ignore malformed */ }
    };

    this.ws.onclose = () => {
      this.connectionState.set('disconnected');
      this.tryReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private tryReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnects) return;
    const delay = Math.pow(2, this.reconnectAttempts) * 1000; // 1s, 2s, 4s
    this.reconnectAttempts++;
    setTimeout(() => this.doConnect(), delay);
  }

  private flushBuffer(): void {
    while (this.buffer.length > 0) {
      const event = this.buffer.shift()!;
      this.send(event);
    }
  }
}
```

- [ ] **Step 3: Create `connected.guard.ts`**

```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PlayerService } from '../services/player.service';
import { WebSocketService } from '../services/websocket.service';

export const connectedGuard: CanActivateFn = () => {
  const player = inject(PlayerService);
  const ws = inject(WebSocketService);
  const router = inject(Router);

  if (player.sessionId() && ws.connectionState() === 'connected') {
    return true;
  }

  // Try restore from sessionStorage
  if (player.restore() && player.sessionId()) {
    // Will reconnect in the component
    return true;
  }

  return router.createUrlTree(['/']);
};
```

- [ ] **Step 4: Verify build**

```bash
npx ng build
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add PlayerService, WebSocketService with reconnect, and connectedGuard"
```

---

## Task 4: GameStateService

**Files:**
- Create: `src/app/shared/services/game-state.service.ts`

- [ ] **Step 1: Create `game-state.service.ts`**

```typescript
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

  // Phase
  gamePhase = signal<GamePhase>('join');

  // Players
  players = signal<PlayerInfo[]>([]);
  playerScores = signal<PlayerScore[]>([]);
  activePlayerId = signal<string | null>(null);

  // Computed
  isMyTurn = computed(() => this.playerService.playerId() === this.activePlayerId());
  scores = computed(() => [...this.playerScores()].sort((a, b) => b.score - a.score));

  // Game
  energyPool = signal<number>(100);
  timer = signal<number>(180);
  currentQuestion = signal<string | null>(null);
  blockPosition = signal<number>(0);
  blockDuration = signal<number>(10000);
  activeEffects = signal<AttackEffect[]>([]);

  // Results
  finalResults = signal<PlayerResult[]>([]);

  // Errors
  lastError = signal<{ message: string; code: string } | null>(null);

  private timerInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.ws.messages$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      switch (event.type) {
        case 'lobby_update':
          this.players.set(event.payload.players);
          if (this.gamePhase() === 'join') this.gamePhase.set('lobby');
          // Detect if current player is host
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
      if (current <= 0) {
        this.stopTimer();
        return;
      }
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

    // Auto-remove after duration
    setTimeout(() => {
      this.activeEffects.update(effects => effects.filter(e => e !== effect));
    }, payload.durationMs);
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npx ng build
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add GameStateService with WS event mapping and timer"
```

---

## Task 5: Pixel Sprites + Shared UI Components

**Files:**
- Create: `src/app/shared/sprites/pixel-sprites.ts`
- Create: `src/app/shared/ui/pixel-button.component.ts`
- Create: `src/app/game/energy-bar.component.ts`
- Create: `src/app/game/timer.component.ts`
- Create: `src/app/game/scoreboard.component.ts`
- Create: `src/app/game/falling-block.component.ts`

- [ ] **Step 1: Create `pixel-sprites.ts`**

```typescript
export interface PixelSprite {
  name: string;
  color: string;
  grid: number[][]; // 0=transparent, 1=color, 2=darker
}

export const SPRITES: PixelSprite[] = [
  { name: 'mug', color: '#f1c40f', grid: [
    [0,1,1,1,0],[0,1,0,1,1],[0,1,2,1,1],[0,1,1,1,0],[1,1,1,1,1]]},
  { name: 'laptop', color: '#3498db', grid: [
    [1,1,1,1,0],[1,0,0,1,0],[1,1,1,1,0],[0,2,2,0,0],[0,0,0,0,0]]},
  { name: 'heart', color: '#e74c3c', grid: [
    [0,1,0,1,0],[1,1,1,1,1],[1,1,1,1,1],[0,1,1,1,0],[0,0,1,0,0]]},
  { name: 'bug', color: '#2ecc71', grid: [
    [0,1,0,1,0],[1,1,1,1,1],[1,2,1,2,1],[1,1,1,1,1],[0,1,0,1,0]]},
  { name: 'rocket', color: '#e67e22', grid: [
    [0,0,1,0,0],[0,1,1,1,0],[0,1,2,1,0],[1,1,1,1,1],[1,0,0,0,1]]},
  { name: 'star', color: '#f1c40f', grid: [
    [0,0,1,0,0],[0,1,1,1,0],[1,1,1,1,1],[0,1,1,1,0],[0,1,0,1,0]]},
  { name: 'key', color: '#f39c12', grid: [
    [0,1,1,0,0],[0,1,1,0,0],[0,0,1,0,0],[0,1,1,1,0],[0,0,1,0,0]]},
  { name: 'bulb', color: '#f1c40f', grid: [
    [0,1,1,1,0],[1,2,0,2,1],[1,0,0,0,1],[0,1,1,1,0],[0,0,1,0,0]]},
  { name: 'gamepad', color: '#9b59b6', grid: [
    [0,0,0,0,0],[1,1,1,1,1],[1,2,1,2,1],[0,1,1,1,0],[0,0,0,0,0]]},
  { name: 'floppy', color: '#3498db', grid: [
    [1,1,1,1,1],[1,0,0,0,1],[1,1,1,1,1],[1,2,2,2,1],[1,1,1,1,1]]},
];

export function getRandomSprite(): PixelSprite {
  return SPRITES[Math.floor(Math.random() * SPRITES.length)];
}
```

- [ ] **Step 2: Create `energy-bar.component.ts`**

```typescript
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-energy-bar',
  standalone: true,
  template: `
    <div class="energy-bar">
      <span class="label">⚡</span>
      <div class="bar">
        <div class="fill" [style.width.%]="energy()" [class.low]="energy() < 20"></div>
      </div>
      <span class="value">{{ energy() }}</span>
    </div>
  `,
  styles: [`
    @use '../../../styles/variables' as *;
    .energy-bar { display: flex; align-items: center; gap: 8px; }
    .label { font-size: 14px; }
    .bar { flex: 1; height: 16px; border: 2px solid $color-text-muted; background: $bg-secondary; }
    .fill { height: 100%; background: $color-warning; transition: width 0.3s; }
    .fill.low { background: $color-danger; }
    .value { font-family: $font-pixel; font-size: 10px; min-width: 30px; }
  `],
})
export class EnergyBarComponent {
  energy = input.required<number>();
}
```

- [ ] **Step 3: Create `timer.component.ts`**

```typescript
import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-timer',
  standalone: true,
  template: `
    <div class="timer" [class.urgent]="secondsLeft() <= 10">
      ⏱ {{ display() }}
    </div>
  `,
  styles: [`
    @use '../../../styles/variables' as *;
    .timer { font-family: $font-pixel; font-size: 12px; }
    .urgent { color: $color-danger; animation: blink 1s infinite; }
  `],
})
export class TimerComponent {
  secondsLeft = input.required<number>();
  display = computed(() => {
    const m = Math.floor(this.secondsLeft() / 60);
    const s = this.secondsLeft() % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  });
}
```

- [ ] **Step 4: Create `scoreboard.component.ts`**

```typescript
import { Component, input } from '@angular/core';
import { PlayerScore } from '../shared/models/player.model';

@Component({
  selector: 'app-scoreboard',
  standalone: true,
  template: `
    <div class="scoreboard">
      @for (player of players(); track player.id) {
        <div class="row" [class.active]="player.id === activePlayerId()">
          <span class="name">{{ player.id === activePlayerId() ? '►' : ' ' }} {{ player.name }}</span>
          <span class="score">{{ player.score }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    @use '../../../styles/variables' as *;
    .scoreboard { display: flex; flex-direction: column; gap: 4px; }
    .row { display: flex; justify-content: space-between; padding: 6px 8px; font-family: $font-pixel; font-size: 10px; }
    .active { background: $bg-accent; color: $color-success; }
  `],
})
export class ScoreboardComponent {
  players = input.required<PlayerScore[]>();
  activePlayerId = input<string | null>(null);
}
```

- [ ] **Step 5: Create `falling-block.component.ts`**

```typescript
import { Component, input, computed } from '@angular/core';
import { PixelSprite } from '../shared/sprites/pixel-sprites';
import { AttackEffect } from '../shared/models/attack.model';

@Component({
  selector: 'app-falling-block',
  standalone: true,
  template: `
    <div class="block-container" [style.transform]="'translateY(' + positionPx() + '%)'">
      <div class="block" [class.hidden]="isHidden()" [class.partial]="isPartial()">
        <div class="sprite">
          @for (row of sprite()?.grid ?? []; track $index) {
            <div class="sprite-row">
              @for (cell of row; track $index) {
                <div class="pixel"
                  [style.background]="cell === 0 ? 'transparent' : cell === 2 ? darken(sprite()!.color) : sprite()!.color">
                </div>
              }
            </div>
          }
        </div>
        <div class="question">{{ displayQuestion() }}</div>
      </div>
    </div>
  `,
  styles: [`
    @use '../../../styles/variables' as *;
    .block-container { transition: transform 100ms linear; position: absolute; left: 50%; transform-origin: top; width: 80%; max-width: 300px; margin-left: -40%; }
    .block { display: flex; align-items: center; gap: 12px; border: 3px solid $color-success; background: $bg-secondary; padding: 12px; }
    .sprite-row { display: flex; }
    .pixel { width: 8px; height: 8px; }
    .question { font-family: $font-pixel; font-size: 9px; line-height: 1.6; color: $color-success; }
    .hidden { animation: blink 0.3s infinite; opacity: 0; }
    .partial .question { color: transparent; text-shadow: 0 0 8px $color-success; }
  `],
})
export class FallingBlockComponent {
  question = input<string | null>(null);
  position = input<number>(0);
  sprite = input<PixelSprite | null>(null);
  effects = input<AttackEffect[]>([]);

  positionPx = computed(() => this.position());

  isHidden = computed(() => this.effects().some(e => e.attackType === 'hide_all'));
  isPartial = computed(() => this.effects().some(e => e.attackType === 'hide_part'));

  displayQuestion = computed(() => {
    const q = this.question();
    if (!q) return '';
    if (this.isPartial()) {
      return q.split('').map((c, i) => i % 2 === 0 ? '░' : c).join('');
    }
    return q;
  });

  darken(color: string): string {
    // Simple darken by reducing hex values
    return color + '88';
  }
}
```

- [ ] **Step 6: Verify build**

```bash
npx ng build
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add pixel sprites and shared game components (energy, timer, scoreboard, falling block)"
```

---

## Task 6: Lobby Feature (Join + Lobby + HostPanel)

**Files:**
- Create: `src/app/lobby/join.component.ts`
- Create: `src/app/lobby/lobby.component.ts`
- Create: `src/app/lobby/host-panel.component.ts`

- [ ] **Step 1: Create `join.component.ts`**

```typescript
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
        <input type="text" [(value)]="name" placeholder="Введи имя..." maxlength="20"
               (keydown.enter)="join()" autofocus />
        <button class="primary" (click)="join()" [disabled]="!name() || loading()">
          {{ loading() ? 'ПОДКЛЮЧЕНИЕ...' : 'ИГРАТЬ' }}
        </button>
      </div>
      @if (error()) {
        <div class="error">{{ error() }}</div>
      }
    </div>
  `,
  styles: [`
    @use '../../../styles/variables' as *;
    .join-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; gap: 32px; }
    .title { font-family: $font-pixel; font-size: 24px; text-align: center; color: $color-success; line-height: 1.8; }
    .form { display: flex; flex-direction: column; gap: 16px; width: 280px; }
    .error { color: $color-danger; font-size: 10px; }
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

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const check = setInterval(() => {
          if (this.ws.connectionState() === 'connected') {
            clearInterval(check);
            resolve();
          }
        }, 100);
        setTimeout(() => { clearInterval(check); reject(new Error('timeout')); }, 5000);
      });

      // Detect playerId from first lobby_update
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
```

- [ ] **Step 2: Create `host-panel.component.ts`**

```typescript
import { Component, inject, signal } from '@angular/core';
import { WebSocketService } from '../shared/services/websocket.service';
import { GameStateService } from '../shared/services/game-state.service';

@Component({
  selector: 'app-host-panel',
  standalone: true,
  template: `
    <div class="host-panel">
      @if (gameState.gamePhase() === 'lobby') {
        <input type="text" [(value)]="context" placeholder="IT команда разработчиков" />
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
    @use '../../../styles/variables' as *;
    .host-panel { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
    .loading { color: $color-warning; font-size: 10px; }
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
```

- [ ] **Step 3: Create `lobby.component.ts`**

```typescript
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
    @use '../../../styles/variables' as *;
    .lobby { display: flex; flex-direction: column; align-items: center; padding: 32px; gap: 16px; height: 100vh; }
    h2 { font-family: $font-pixel; font-size: 16px; color: $color-success; }
    .players { display: flex; flex-direction: column; gap: 8px; width: 280px; }
    .player { padding: 8px 12px; background: $bg-secondary; border: 2px solid $color-text-muted; font-size: 10px; }
    .player.host { border-color: $color-warning; }
    .count { color: $color-text-muted; font-size: 10px; }
    .waiting { color: $color-text-muted; font-size: 10px; animation: blink 2s infinite; }
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
```

- [ ] **Step 4: Verify build**

```bash
npx ng build
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add lobby feature (join, lobby, host panel with question generation)"
```

---

## Task 7: Game Feature (Play + AttackPanel)

**Files:**
- Create: `src/app/game/attack-panel.component.ts`
- Create: `src/app/game/play.component.ts`

- [ ] **Step 1: Create `attack-panel.component.ts`**

```typescript
import { Component, input, output } from '@angular/core';
import { ATTACKS, AttackType } from '../shared/models/attack.model';

@Component({
  selector: 'app-attack-panel',
  standalone: true,
  template: `
    <div class="attacks">
      @for (attack of attacks; track attack.type) {
        <button class="attack-btn"
                [disabled]="energy() < attack.cost || isMyTurn()"
                (click)="attackSelected.emit(attack.type)">
          <span class="icon">{{ attack.icon }}</span>
          <span class="cost">{{ attack.cost }}⚡</span>
        </button>
      }
    </div>
  `,
  styles: [`
    @use '../../../styles/variables' as *;
    .attacks { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .attack-btn {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 12px 8px; font-family: $font-pixel; font-size: 8px;
      border: 2px solid $color-text-muted; background: $bg-secondary; color: $color-text;
    }
    .attack-btn:not(:disabled):hover { border-color: $color-warning; background: $bg-accent; }
    .icon { font-size: 20px; }
    .cost { color: $color-warning; }
  `],
})
export class AttackPanelComponent {
  energy = input.required<number>();
  isMyTurn = input.required<boolean>();
  attackSelected = output<AttackType>();
  attacks = ATTACKS;
}
```

- [ ] **Step 2: Create `play.component.ts`**

```typescript
import { Component, inject, signal, effect } from '@angular/core';
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
            <div class="ground">▲ ДНО ▲</div>
          </div>
          <div class="answer-form">
            @if (isLocked()) {
              <div class="locked-overlay">🔒 ЗАБЛОКИРОВАНО</div>
            }
            <input type="text" [(value)]="answer" placeholder="Ответ..."
                   (keydown.enter)="submitAnswer()" [disabled]="isLocked()" autofocus />
            <button class="primary" (click)="submitAnswer()" [disabled]="!answer() || isLocked()">
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
    @use '../../../styles/variables' as *;
    .play-screen { display: flex; flex-direction: column; height: 100vh; padding: 16px; gap: 16px; }
    .header { display: flex; justify-content: space-between; align-items: center; }
    .my-turn { flex: 1; display: flex; flex-direction: column; gap: 12px; }
    .game-field { flex: 1; position: relative; border: 2px solid $color-text-muted; overflow: hidden; }
    .game-field.locked { animation: shake 0.3s infinite; }
    .ground { position: absolute; bottom: 0; width: 100%; text-align: center; border-top: 3px dashed $color-danger; color: $color-danger; font-size: 8px; padding: 4px; }
    .answer-form { display: flex; gap: 8px; position: relative; }
    .answer-form input { flex: 1; }
    .locked-overlay { position: absolute; inset: 0; background: rgba($color-danger, 0.8); display: flex; align-items: center; justify-content: center; font-size: 10px; z-index: 1; }
    .not-my-turn { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; }
    .active-label { color: $color-text-muted; font-size: 10px; }
    .active-name { font-size: 16px; color: $color-success; }
    .my-score { text-align: center; font-size: 10px; color: $color-text-muted; padding: 8px; border-top: 2px solid $color-text-muted; }
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
    // New sprite each turn
    effect(() => {
      this.gameState.activePlayerId(); // track
      this.currentSprite.set(getRandomSprite());
      this.answer.set('');
    });
    // Navigate to results
    effect(() => {
      if (this.gameState.gamePhase() === 'results') {
        this.router.navigate(['/results']);
      }
    });
  }

  myEffects = () => this.gameState.activeEffects().filter(
    e => e.targetId === this.playerService.playerId()
  );

  isLocked = () => this.myEffects().some(e => e.attackType === 'lock_input');

  activePlayerName = () => {
    const id = this.gameState.activePlayerId();
    return this.gameState.players().find(p => p.id === id)?.name ?? '';
  };

  myScore = () => this.gameState.playerScores().find(
    p => p.id === this.playerService.playerId()
  )?.score ?? 0;

  myPlace = () => {
    const sorted = this.gameState.scores();
    const idx = sorted.findIndex(p => p.id === this.playerService.playerId());
    return idx >= 0 ? `#${idx + 1}` : '';
  };

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
```

- [ ] **Step 3: Verify build**

```bash
npx ng build
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add play screen with attack panel, falling block, and answer form"
```

---

## Task 8: Screen Component (Projector)

**Files:**
- Create: `src/app/game/screen.component.ts`

- [ ] **Step 1: Create `screen.component.ts`**

```typescript
import { Component, inject, signal, effect, OnInit } from '@angular/core';
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
              @if (gameState.gamePhase() === 'lobby') { ОЖИДАНИЕ ИГРОКОВ... }
              @if (gameState.gamePhase() === 'waiting') { ГЕНЕРАЦИЯ ВОПРОСОВ... }
              @if (gameState.gamePhase() === 'ready') { ГОТОВО К СТАРТУ }
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
    @use '../../../styles/variables' as *;
    .screen { height: 100vh; display: flex; flex-direction: column; padding: 24px; }
    .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    h1 { font-family: $font-pixel; font-size: 20px; color: $color-success; }
    .main { flex: 1; display: grid; grid-template-columns: 1fr 300px; gap: 24px; }
    .game-area { position: relative; border: 3px solid $color-text-muted; overflow: hidden; }
    .ground { position: absolute; bottom: 0; width: 100%; text-align: center; border-top: 3px dashed $color-danger; color: $color-danger; font-family: $font-pixel; font-size: 10px; padding: 8px; }
    .waiting-label { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 14px; color: $color-text-muted; animation: blink 2s infinite; }
    .sidebar { display: flex; flex-direction: column; gap: 16px; }
    h3 { font-family: $font-pixel; font-size: 12px; color: $color-warning; margin: 0; }
  `],
})
export class ScreenComponent implements OnInit {
  gameState = inject(GameStateService);
  private ws = inject(WebSocketService);
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  currentSprite = signal<PixelSprite>(getRandomSprite());

  constructor() {
    effect(() => {
      this.gameState.activePlayerId();
      this.currentSprite.set(getRandomSprite());
    });
  }

  async ngOnInit(): Promise<void> {
    // Screen auto-connects as observer
    try {
      const res = await firstValueFrom(
        this.http.post<{ sessionId: string }>(`${this.config.apiUrl}/api/sessions`, {})
      );
      this.ws.connect(res.sessionId); // no playerName → __screen__
    } catch { /* retry on reload */ }
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npx ng build
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add projector screen component with game area and sidebar"
```

---

## Task 9: Results Feature

**Files:**
- Create: `src/app/results/confetti.component.ts`
- Create: `src/app/results/results.component.ts`

- [ ] **Step 1: Create `confetti.component.ts`**

```typescript
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-confetti',
  standalone: true,
  template: `<div class="confetti-container"><div class="confetti" *ngFor="let p of particles">{{ p }}</div></div>`,
  styles: [`
    .confetti-container { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 100; }
    .confetti {
      position: absolute; font-size: 20px;
      animation: confetti-fall 3s ease-in forwards;
    }
    @keyframes confetti-fall {
      0% { top: -10%; opacity: 1; }
      100% { top: 110%; opacity: 0; }
    }
  `],
})
export class ConfettiComponent implements OnInit {
  particles: string[] = [];

  ngOnInit(): void {
    const emojis = ['🎉', '🏆', '⭐', '🚀', '🎊', '✨'];
    this.particles = Array.from({ length: 30 }, () => emojis[Math.floor(Math.random() * emojis.length)]);
  }
}
```

- [ ] **Step 2: Create `results.component.ts`**

```typescript
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
    @use '../../../styles/variables' as *;
    .results { display: flex; flex-direction: column; align-items: center; padding: 32px; gap: 24px; height: 100vh; }
    h1 { font-family: $font-pixel; font-size: 18px; color: $color-warning; }
    .table { width: 100%; max-width: 500px; display: flex; flex-direction: column; gap: 8px; }
    .row { display: grid; grid-template-columns: 40px 1fr 1fr 60px; gap: 8px; padding: 10px; background: $bg-secondary; border: 2px solid $color-text-muted; font-size: 9px; align-items: center; }
    .winner { border-color: $color-warning; background: $bg-accent; }
    .place { color: $color-warning; }
    .title { color: $color-info; font-size: 8px; }
    .score { text-align: right; color: $color-success; }
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
```

- [ ] **Step 3: Verify build**

```bash
npx ng build
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add results screen with confetti and play again"
```

---

## Task 10: Mock WebSocket Server

**Files:**
- Create: `mock-server/package.json`
- Create: `mock-server/tsconfig.json`
- Create: `mock-server/server.ts`
- Create: `mock-server/data/questions.json`

- [ ] **Step 1: Create `mock-server/package.json`**

```json
{
  "name": "standup-speedrun-mock",
  "private": true,
  "scripts": { "start": "npx tsx server.ts" },
  "dependencies": { "ws": "^8.16.0", "express": "^4.18.0" },
  "devDependencies": { "tsx": "^4.7.0", "@types/ws": "^8.5.0", "@types/express": "^4.17.0", "typescript": "^5.4.0" }
}
```

- [ ] **Step 2: Create `mock-server/data/questions.json`**

```json
[
  "Что сделал вчера кроме созвонов?",
  "Есть блокеры? Только честно.",
  "Когда будет готово? Примерно?",
  "Сколько раз гуглил ошибку?",
  "Ты вообще коммитил сегодня?",
  "Стендап или стендлежа?",
  "Кто сломал прод вчера?",
  "Докер опять не работает?",
  "Тесты зелёные или как всегда?",
  "Ревью висит сколько дней?",
  "Что ел на обеде?",
  "Кофе или чай сегодня?",
  "Сколько вкладок открыто?",
  "Баг или фича? Никто не знает",
  "Рефакторить или оставить?",
  "Деплой в пятницу будет?",
  "Линтер ругается на тебя?",
  "TypeScript сильнее тебя?",
  "Merge conflict решил?",
  "README обновил? Вот именно.",
  "Задача в джире двигал?",
  "Sprint goal помнишь?",
  "Ретро прошла даром?",
  "Микросервис или монолит?",
  "Кто код ревьюить будет?",
  "Пайплайн опять красный?",
  "git push --force делал?",
  "Stack Overflow спас снова?",
  "ChatGPT написал за тебя?",
  "Выходные были продуктивны?"
]
```

- [ ] **Step 3: Create `mock-server/server.ts`**

```typescript
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';

const app = express();
app.use(express.json());

// CORS
app.use((_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const server = createServer(app);
const wss = new WebSocketServer({ server });

const SESSION_ID = '00000000-0000-0000-0000-000000000001';
const questions: string[] = JSON.parse(readFileSync(join(__dirname, 'data/questions.json'), 'utf-8'));

interface Player { id: string; name: string; isHost: boolean; ws: WebSocket; score: number; answersCount: number; missedCount: number; energySpent: number; likesGiven: number; }

let players: Player[] = [];
let status: 'lobby' | 'waiting' | 'ready' | 'active' | 'finished' = 'lobby';
let energy = 100;
let questionIndex = 0;
let currentPlayerIndex = 0;
let blockInterval: ReturnType<typeof setInterval> | null = null;
let gameTimer: ReturnType<typeof setTimeout> | null = null;
let energyInterval: ReturnType<typeof setInterval> | null = null;
let blockStart = 0;
const BLOCK_DURATION = 10000;
const GAME_DURATION = 180;

// REST
app.get('/health', (_, res) => res.json({ status: 'ok' }));
app.post('/api/sessions', (_, res) => res.status(201).json({ sessionId: SESSION_ID }));
app.get('/api/sessions/:id', (_, res) => res.json({ sessionId: SESSION_ID, status, playerCount: players.length, maxPlayers: 10 }));

function broadcast(msg: object) {
  const data = JSON.stringify(msg);
  players.forEach(p => { if (p.ws.readyState === WebSocket.OPEN) p.ws.send(data); });
}

function sendTo(ws: WebSocket, msg: object) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function lobbyUpdate() {
  broadcast({ type: 'lobby_update', payload: { players: players.map(p => ({ id: p.id, name: p.name, isHost: p.isHost })) } });
}

function scoreUpdate() {
  broadcast({ type: 'score_update', payload: { players: players.map(p => ({ id: p.id, name: p.name, score: p.score, answersCount: p.answersCount, missedCount: p.missedCount })) } });
}

function nextTurn() {
  if (status !== 'active') return;
  if (questionIndex >= questions.length) { endGame(); return; }
  const player = players[currentPlayerIndex % players.length];
  broadcast({ type: 'turn', payload: { activePlayerId: player.id, question: questions[questionIndex], blockDurationMs: BLOCK_DURATION } });
  questionIndex++;
  blockStart = Date.now();
  if (blockInterval) clearInterval(blockInterval);
  blockInterval = setInterval(() => {
    const elapsed = Date.now() - blockStart;
    const pos = Math.min((elapsed / BLOCK_DURATION) * 100, 100);
    broadcast({ type: 'block_position', payload: { position: Math.round(pos * 10) / 10 } });
    if (pos >= 100) {
      clearInterval(blockInterval!);
      player.missedCount++;
      players.forEach(p => p.score = Math.max(0, p.score - 5));
      scoreUpdate();
      currentPlayerIndex++;
      nextTurn();
    }
  }, 100);
}

function endGame() {
  status = 'finished';
  if (blockInterval) clearInterval(blockInterval);
  if (gameTimer) clearTimeout(gameTimer);
  if (energyInterval) clearInterval(energyInterval);

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const titles = ['🚀 10x Developer', '😈 Главный саботажник', '🛡️ Командный игрок', '🧱 Блокер команды', '☕ Проснулся к концу'];
  const results = sorted.map((p, i) => ({
    id: p.id, name: p.name, score: p.score, title: titles[i % titles.length],
    answersCount: p.answersCount, missedCount: p.missedCount, energySpent: p.energySpent, likesGiven: p.likesGiven, place: i + 1,
  }));
  broadcast({ type: 'game_over', payload: { players: results } });
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url!, `http://localhost`);
  const name = url.searchParams.get('name') || 'Anon';
  if (name === '__screen__') { players.forEach(p => {}); return; } // observer, just receives broadcasts

  const id = `player-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const player: Player = { id, name, isHost: players.length === 0, ws, score: 0, answersCount: 0, missedCount: 0, energySpent: 0, likesGiven: 0 };
  players.push(player);
  lobbyUpdate();

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      switch (msg.type) {
        case 'generate':
          if (!player.isHost) { sendTo(ws, { type: 'error', payload: { message: 'not host', code: 'NOT_HOST' } }); break; }
          status = 'waiting';
          setTimeout(() => { status = 'ready'; broadcast({ type: 'questions_ready', payload: {} }); }, 2000);
          break;

        case 'start':
          if (!player.isHost || status !== 'ready') break;
          status = 'active';
          const endsAt = new Date(Date.now() + GAME_DURATION * 1000).toISOString();
          broadcast({ type: 'game_start', payload: { endsAt, durationSeconds: GAME_DURATION } });
          gameTimer = setTimeout(() => endGame(), GAME_DURATION * 1000);
          energyInterval = setInterval(() => { energy = Math.min(100, energy + 5); broadcast({ type: 'energy_update', payload: { energy } }); }, 2000);
          questionIndex = 0; currentPlayerIndex = 0;
          nextTurn();
          break;

        case 'answer':
          if (players[currentPlayerIndex % players.length]?.id !== player.id) break;
          if (blockInterval) clearInterval(blockInterval);
          player.score += 25;
          player.answersCount++;
          scoreUpdate();
          currentPlayerIndex++;
          nextTurn();
          break;

        case 'attack': {
          const cost = { like: 5, add_block: 20, lock_input: 25, hide_part: 15, hide_all: 30 }[msg.payload.attackType] ?? 0;
          if (energy < cost) { sendTo(ws, { type: 'error', payload: { message: 'not enough energy', code: 'INSUFFICIENT_ENERGY' } }); break; }
          energy -= cost;
          player.energySpent += cost;
          if (msg.payload.attackType === 'like') player.likesGiven++;
          const durMap: Record<string, number> = { lock_input: 4000, hide_part: 5000, hide_all: 5000 };
          broadcast({ type: 'attack_applied', payload: { attackType: msg.payload.attackType, attackerId: player.id, targetId: msg.payload.targetId, durationMs: durMap[msg.payload.attackType] ?? 0 } });
          broadcast({ type: 'energy_update', payload: { energy } });
          if (msg.payload.attackType === 'like') {
            const target = players.find(p => p.id === msg.payload.targetId);
            if (target) { target.score += 15; scoreUpdate(); }
          }
          break;
        }
      }
    } catch {}
  });

  ws.on('close', () => {
    players = players.filter(p => p.id !== id);
    lobbyUpdate();
  });
});

const PORT = 8080;
server.listen(PORT, () => console.log(`Mock server: http://localhost:${PORT}`));
```

- [ ] **Step 4: Install dependencies and test**

```bash
cd mock-server && npm install && npm start
```

Verify: `http://localhost:8080/health` returns `{"status":"ok"}`

- [ ] **Step 5: Commit**

```bash
cd .. && git add -A && git commit -m "feat: add mock WebSocket server with full game loop simulation"
```

---

## Task 11: Docker Setup

**Files:**
- Create: `Dockerfile`
- Create: `nginx.conf`
- Create: `docker-entrypoint.sh`
- Create: `docker-compose.yml`
- Create: `.dockerignore`

- [ ] **Step 1: Create all Docker files**

`Dockerfile`:
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration=production

FROM nginx:alpine
COPY --from=build /app/dist/standup-speedrun/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
```

`nginx.conf`:
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    location / { try_files $uri $uri/ /index.html; }
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ { expires 1y; add_header Cache-Control "public, immutable"; }
}
```

`docker-entrypoint.sh`:
```bash
#!/bin/sh
sed -i "s|__API_URL__|${API_URL:-http://localhost:8080}|g" /usr/share/nginx/html/assets/config.json
sed -i "s|__WS_URL__|${WS_URL:-ws://localhost:8080}|g" /usr/share/nginx/html/assets/config.json
exec nginx -g 'daemon off;'
```

`docker-compose.yml`:
```yaml
services:
  frontend:
    build: .
    ports: ["4200:80"]
    environment:
      API_URL: http://mock-server:8080
      WS_URL: ws://mock-server:8080
  mock-server:
    build: ./mock-server
    ports: ["8080:8080"]
```

`.dockerignore`:
```
node_modules
dist
.angular
mock-server/node_modules
```

Update `assets/config.json` for Docker template:
```json
{
  "apiUrl": "__API_URL__",
  "wsUrl": "__WS_URL__"
}
```

- [ ] **Step 2: Verify Docker build**

```bash
docker build -t standup-speedrun .
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add Dockerfile, nginx config, and docker-compose for deployment"
```

---

## Task 12: SoundService + Final Polish

**Files:**
- Create: `src/app/shared/services/sound.service.ts`
- Modify: `src/app/game/play.component.ts` (add sound triggers)

- [ ] **Step 1: Create `sound.service.ts`**

```typescript
import { Injectable, signal } from '@angular/core';

export type SoundEffect = 'answer_success' | 'block_missed' | 'attack_applied' | 'like_received' | 'game_start' | 'game_over' | 'confetti' | 'tick';

@Injectable({ providedIn: 'root' })
export class SoundService {
  isMuted = signal(false);

  // Placeholder — real sounds can be added to assets/sounds/ later
  play(sound: SoundEffect): void {
    if (this.isMuted()) return;
    // Will load from assets/sounds/{sound}.mp3 when sound files are added
    try {
      const audio = new Audio(`/assets/sounds/${sound}.mp3`);
      audio.volume = 0.5;
      audio.play().catch(() => {}); // ignore if no file yet
    } catch {}
  }

  toggleMute(): void {
    this.isMuted.update(v => !v);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add SoundService placeholder for audio effects"
```

---

## Summary

| Task | Description | Depends on |
|------|-------------|------------|
| 1 | Project scaffold + global styles | — |
| 2 | Models + Config service | 1 |
| 3 | PlayerService + WebSocketService + Guard | 2 |
| 4 | GameStateService | 3 |
| 5 | Pixel sprites + shared UI components | 2 |
| 6 | Lobby feature (Join + Lobby + HostPanel) | 4 |
| 7 | Game feature (Play + AttackPanel) | 4, 5 |
| 8 | Screen component (Projector) | 4, 5 |
| 9 | Results feature | 4 |
| 10 | Mock WebSocket server | — |
| 11 | Docker setup | 1 |
| 12 | SoundService | 4 |
