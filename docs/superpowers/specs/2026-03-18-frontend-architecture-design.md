# Standup Speedrun — Frontend Architecture Design

## Обзор

Фронтенд для мультиплеерной браузерной игры Standup Speedrun. Angular 19, standalone components, signals, пиксельный стиль "Clean Pixel". Деплой через Docker (nginx), бэкенд — отдельный репозиторий на Go.

---

## 1. Структура проекта

```
standup-speedrun/
├── src/
│   ├── app/
│   │   ├── app.component.ts
│   │   ├── app.config.ts
│   │   ├── app.routes.ts
│   │   │
│   │   ├── lobby/
│   │   │   ├── join.component.ts
│   │   │   ├── lobby.component.ts
│   │   │   └── host-panel.component.ts
│   │   │
│   │   ├── game/
│   │   │   ├── play.component.ts
│   │   │   ├── screen.component.ts
│   │   │   ├── falling-block.component.ts
│   │   │   ├── attack-panel.component.ts
│   │   │   ├── energy-bar.component.ts
│   │   │   ├── timer.component.ts
│   │   │   └── scoreboard.component.ts
│   │   │
│   │   ├── results/
│   │   │   ├── results.component.ts
│   │   │   └── confetti.component.ts
│   │   │
│   │   └── shared/
│   │       ├── services/
│   │       │   ├── websocket.service.ts
│   │       │   ├── game-state.service.ts
│   │       │   ├── player.service.ts
│   │       │   └── sound.service.ts
│   │       ├── models/
│   │       │   ├── player.model.ts
│   │       │   ├── game-state.model.ts
│   │       │   ├── ws-events.model.ts
│   │       │   └── attack.model.ts
│   │       ├── sprites/
│   │       │   └── pixel-sprites.ts
│   │       └── ui/
│   │           └── pixel-button.component.ts
│   │
│   ├── assets/
│   │   ├── sounds/
│   │   └── fonts/
│   │
│   ├── styles/
│   │   ├── _variables.scss
│   │   ├── _pixel-theme.scss
│   │   └── styles.scss
│   │
│   └── environments/
│       ├── environment.ts
│       └── environment.development.ts
│
├── mock-server/
│   ├── server.ts
│   ├── handlers/
│   └── data/
│
├── Dockerfile
├── nginx.conf
└── docker-compose.yml
```

---

## 2. Маршрутизация

Все роуты lazy-loaded через `loadComponent`. SessionId не в URL — хранится в `PlayerService`.

| Route | Компонент | Guard | Назначение |
|-------|-----------|-------|------------|
| `/` | `JoinComponent` | — | Ввод имени |
| `/lobby` | `LobbyComponent` | `connectedGuard` | Ожидание игроков |
| `/play` | `PlayComponent` | `connectedGuard` | Личный экран игрока |
| `/screen` | `ScreenComponent` | — | Общий экран (проектор) |
| `/results` | `ResultsComponent` | `connectedGuard` | Финальный экран |

**Flow подключения:**
1. Игрок заходит на `/`, вводит имя
2. Фронт вызывает `POST /api/sessions` — бэк возвращает один и тот же sessionId
3. SessionId сохраняется в `PlayerService` + sessionStorage (для реконнекта)
4. WS подключается к `/ws/:sessionId?name=...`
5. Навигация на `/lobby`

Для `/screen` (проектор): тот же `POST /api/sessions` возвращает текущую сессию, WS подключается без имени.

### connectedGuard

Functional guard, проверяет:
1. `PlayerService.sessionId()` не null
2. `WebSocketService.connectionState()` === `'connected'`

Если проверка не пройдена — редирект на `/`. При наличии sessionId в sessionStorage — попытка автореконнекта перед редиректом.

---

## 3. Управление состоянием

Три сервиса на Angular Signals, без NgRx/NGXS.

### WebSocketService

```typescript
@Injectable({ providedIn: 'root' })
export class WebSocketService {
  connectionState = signal<'connecting' | 'connected' | 'disconnected'>('disconnected');

  private messages = new Subject<WsServerEvent>();
  messages$ = this.messages.asObservable();

  connect(sessionId: string, playerName?: string): void;
  disconnect(): void;
  send(event: WsClientEvent): void;

  // Реконнект: 3 попытки, exponential backoff (1с → 2с → 4с)
  // Буфер сообщений при disconnected — отправляет после реконнекта
}
```

### GameStateService

```typescript
@Injectable({ providedIn: 'root' })
export class GameStateService {
  // Фаза
  gamePhase = signal<'join' | 'lobby' | 'waiting' | 'ready' | 'playing' | 'results'>('join');

  // Игроки
  players = signal<PlayerInfo[]>([]);
  activePlayerId = signal<string | null>(null);

  // Computed
  isMyTurn = computed(() => this.playerService.playerId() === this.activePlayerId());
  scores = computed(() => [...this.players()].sort((a, b) => b.score - a.score));

  // Игра
  energyPool = signal<number>(100);
  timer = signal<number>(180);
  currentQuestion = signal<string | null>(null);
  blockPosition = signal<number>(0);
  blockDuration = signal<number>(10000);
  activeEffects = signal<AttackEffect[]>([]);

  // Результаты
  finalResults = signal<PlayerResult[]>([]);

  // Маппинг WS событий → signals в конструкторе
}
```

### PlayerService

```typescript
@Injectable({ providedIn: 'root' })
export class PlayerService {
  playerId = signal<string | null>(null);
  playerName = signal<string | null>(null);
  isHost = signal<boolean>(false);
  sessionId = signal<string | null>(null);

  // Persist в sessionStorage для реконнекта
}
```

### Data Flow

```
Server (WS)
    │
    ▼
WebSocketService.messages$  ───►  Observable<WsServerEvent>
    │
    ▼
GameStateService            ───►  Signals (источник правды)
    │
    ├──► PlayComponent      (читает signals, send() для ответов/атак)
    ├──► ScreenComponent    (читает signals, только отображение)
    ├──► LobbyComponent     (читает players, isHost)
    └──► ResultsComponent   (читает scores, titles)
```

Компоненты только читают signals и вызывают методы сервисов для действий.

---

## 4. WebSocket типизация

Соответствует API бэкендера (API.md).

### Client → Server

```typescript
type WsClientEvent =
  | { type: 'generate'; payload: { context: string } }
  | { type: 'start';    payload: Record<string, never> }
  | { type: 'answer';   payload: { text: string } }
  | { type: 'attack';   payload: { attackType: AttackType; targetId: string } }

type AttackType = 'like' | 'add_block' | 'lock_input' | 'hide_part' | 'hide_all'
```

### Server → Client

```typescript
type WsServerEvent =
  | { type: 'lobby_update';    payload: { players: PlayerInfo[] } }
  | { type: 'questions_ready'; payload: Record<string, never> }
  | { type: 'game_start';      payload: { endsAt: string; durationSeconds: number } }
  | { type: 'turn';            payload: { activePlayerId: string; question: string; blockDurationMs: number } }
  | { type: 'block_position';  payload: { position: number } }
  | { type: 'attack_applied';  payload: { attackType: AttackType; attackerId: string; targetId: string; durationMs: number } }
  | { type: 'energy_update';   payload: { energy: number } }
  | { type: 'score_update';    payload: { players: PlayerScore[] } }
  | { type: 'game_over';       payload: { players: PlayerResult[] } }
  | { type: 'error';           payload: { message: string; code: ErrorCode } }

type ErrorCode =
  | 'INSUFFICIENT_ENERGY'
  | 'NOT_YOUR_TURN'
  | 'NOT_HOST'
  | 'INVALID_STATUS'
  | 'SESSION_FULL'
  | 'SESSION_NOT_FOUND'
```

### Модели данных

```typescript
interface PlayerInfo {
  id: string;
  name: string;
  isHost: boolean;
}

interface PlayerScore {
  id: string;
  name: string;
  score: number;
  answersCount: number;
  missedCount: number;
}

interface PlayerResult {
  id: string;
  name: string;
  score: number;
  title: string;          // "🚀 10x Developer"
  answersCount: number;
  missedCount: number;
  energySpent: number;
  likesGiven: number;
  place: number;          // 1-based
}

interface AttackEffect {
  attackType: AttackType;
  attackerId: string;
  targetId: string;
  durationMs: number;
  expiresAt: number;      // Date.now() + durationMs, для auto-remove
}
```

### GamePhase flow

```
'join' → 'lobby' → 'waiting' → 'ready' → 'playing' → 'results'
                    ↑ generate   ↑ questions_ready     ↑ game_over
```

> **Маппинг статусов:** API сессии использует `active`, фронт использует `playing` для того же состояния. При проверке через `GET /api/sessions/:id` маппить `active` → `playing`.

---

## 5. Компонентная архитектура

### PlayComponent (личный экран, mobile-first)

```
┌─────────────────────────┐
│  ⏱ 02:31    ⚡ 75/100   │  ← таймер + энергия (всегда видны)
├─────────────────────────┤
│  Когда НЕ мой ход:      │
│  - Имя активного игрока │
│  - Кнопки атак (серые   │
│    если нет энергии)     │
│  - Моё место и очки     │
├─────────────────────────┤
│  Когда МОЙ ход:         │
│  - Падающий блок с       │
│    pixel art спрайтом   │
│  - Поле ввода (автофокус)│
│  - Кнопка ОТВЕТИТЬ      │
└─────────────────────────┘
```

Переключение через `isMyTurn` computed signal, `@if` в шаблоне.

### ScreenComponent (проектор)

```
┌──────────────────────────────────────────────┐
│              STANDUP SPEEDRUN     ⏱ 02:31    │
├────────────────────────────┬─────────────────┤
│                            │  ИГРОКИ         │
│   Pixel art спрайт         │  ► Вася   320   │
│   + вопрос в блоке         │    Петя   280   │
│   (падает сверху вниз)     │    Эрик   150   │
│                            │─────────────────│
│                            │  ЭНЕРГИЯ        │
│   ░░░░░░░░ дно ░░░░░░░░   │  ████████░░ 75  │
└────────────────────────────┴─────────────────┘
```

CSS Grid: `grid-template-columns: 1fr 300px`.

### Переиспользуемые компоненты

| Компонент | Inputs | Outputs | Используется в |
|-----------|--------|---------|---------------|
| `FallingBlockComponent` | question, position, effects, sprite | — | Play, Screen |
| `EnergyBarComponent` | energy | — | Play, Screen |
| `TimerComponent` | secondsLeft | — | Play, Screen |
| `ScoreboardComponent` | players, activePlayerId | — | Screen, Results |
| `AttackPanelComponent` | energy, isMyTurn | attackSelected | Play |
| `ConfettiComponent` | — | — | Results |

Все презентационные — inputs/outputs, без инъекции сервисов.

### HostPanelComponent (внутри LobbyComponent)

- Поле ввода контекста (необязательное, placeholder: "IT команда разработчиков")
- Кнопка "Сгенерировать вопросы" → отправляет `generate` событие
- Во время генерации (`gamePhase === 'waiting'`): лоадер с пиксельной анимацией
- При ошибке генерации (`error` с `code: 'INVALID_STATUS'`): сообщение об ошибке + кнопка "Попробовать снова"
- После `questions_ready`: кнопка "Начать игру" становится активной

> **Превью вопросов:** PRD требует показать первые 5 вопросов Host-у. В текущем API.md нет эндпоинта для этого. Нужно согласовать с бэкендером: либо добавить `GET /api/sessions/:sessionId/questions?limit=5`, либо включить превью в payload `questions_ready`.

### ResultsComponent

- Таблица игроков с анимацией появления (по очереди, от последнего к первому)
- Каждый игрок: место, имя, очки, титул
- Победитель (place === 1): ConfettiComponent + звук
- Кнопка "Играть снова" → навигация на `/lobby`, сброс GameStateService

> **"Играть снова":** В текущем API.md нет события для рестарта. Нужно согласовать с бэкендером: либо WS событие `restart`, либо фронт делает `POST /api/sessions` + реконнект к новой/той же сессии.

### Обработка ошибок

WS `error` события обрабатываются в `GameStateService.handleError()`:

| Код ошибки | UI |
|-----------|-----|
| `INSUFFICIENT_ENERGY` | Тряска кнопки атаки, текст "Нет энергии" на 2 сек |
| `NOT_YOUR_TURN` | Игнорируется (не должно произойти при правильной логике) |
| `NOT_HOST` | Игнорируется |
| `INVALID_STATUS` | Toast-уведомление |
| `SESSION_FULL` | Экран "Игра заполнена" с предложением подождать |
| `SESSION_NOT_FOUND` | Редирект на `/` |

### SoundService

```typescript
@Injectable({ providedIn: 'root' })
export class SoundService {
  isMuted = signal<boolean>(false);

  play(sound: SoundEffect): void;
  toggleMute(): void;
}

type SoundEffect =
  | 'answer_success'    // успешный ответ
  | 'block_missed'      // блок достиг дна
  | 'attack_applied'    // атака применена
  | 'like_received'     // получен лайк
  | 'game_start'        // начало игры
  | 'game_over'         // конец игры
  | 'confetti'          // победитель
  | 'tick'              // последние 10 секунд таймера
```

Реализация: `HTMLAudioElement`, предзагрузка в конструкторе. Кнопка mute в header каждого экрана.

---

## 6. Визуальный стиль — Clean Pixel

### Палитра

| Переменная | Цвет | Назначение |
|-----------|------|------------|
| `$bg-primary` | `#1a1a2e` | Основной фон |
| `$bg-secondary` | `#16213e` | Карточки, инпуты |
| `$bg-accent` | `#0f3460` | Подсветка |
| `$color-success` | `#2ecc71` | Успех, ответ |
| `$color-danger` | `#e74c3c` | Провал, штраф |
| `$color-warning` | `#f1c40f` | Атаки, энергия |
| `$color-info` | `#3498db` | Информация, лайк |
| `$color-text` | `#ffffff` | Основной текст |

### Шрифт

- **Заголовки и UI:** Press Start 2P (Google Fonts)
- **Поле ввода:** system monospace (Press Start 2P тяжело читать мелко)
- **Проектор:** увеличенные размеры (вопрос читаем с 2-3 метров)

### Pixel Art спрайты

Падающие блоки — pixel art предметы ~5x5 пикселей рядом с вопросом. Описываются как двумерные массивы:

```typescript
interface PixelSprite {
  name: string;
  color: string;
  grid: number[][]; // 0=transparent, 1=color, 2=darker shade
}
```

Пул спрайтов (~10): кружка кофе, ноутбук, сердце, баг, ракета, звезда, ключ, лампочка, геймпад, дискета. Рандомный спрайт при каждом `turn`.

### Анимации (CSS @keyframes)

| Анимация | Триггер | Реализация |
|----------|---------|------------|
| Падение блока | `turn` + `block_position` | CSS `transition: transform 100ms linear` на блоке, обновляется каждые 100мс из `block_position` signal. Не @keyframes — позиция управляется сервером. |
| Зелёная вспышка | Успешный ответ | `background` flash на игровом поле |
| Красная вспышка + тряска | Блок достиг дна | `background` flash + `translateX` shake |
| Мигание блока | `hide_part` / `hide_all` | `opacity` blink |
| Тряска инпута | `lock_input` | `translateX` shake на поле ввода + overlay "ЗАБЛОКИРОВАНО" |
| Доп. блок | `add_block` | Toast "💣 +1 блок!" на экране активного игрока |

Все анимации на чистом CSS, без JS-библиотек.

---

## 7. Docker и деплой

### Dockerfile (multi-stage)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration=production

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /app/dist/standup-speedrun/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
```

### nginx.conf

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Переменные окружения

API/WS URL передаётся через runtime-конфиг (без пересборки Docker-образа):

**`assets/config.json`** — шаблон, перезаписывается при запуске контейнера:

```json
{
  "apiUrl": "__API_URL__",
  "wsUrl": "__WS_URL__"
}
```

**Entrypoint скрипт** (`docker-entrypoint.sh`):

```bash
#!/bin/sh
# Подставляем переменные окружения в config.json
sed -i "s|__API_URL__|${API_URL:-http://localhost:8080}|g" /usr/share/nginx/html/assets/config.json
sed -i "s|__WS_URL__|${WS_URL:-ws://localhost:8080}|g" /usr/share/nginx/html/assets/config.json
exec nginx -g 'daemon off;'
```

**Запуск:**

```bash
docker run -e API_URL=http://api.example.com -e WS_URL=ws://api.example.com -p 80:80 standup-speedrun
```

### docker-compose.yml (локальная разработка)

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

---

## 8. Mock WebSocket сервер

Node.js сервер, имитирует все события из API.md для локальной разработки.

```
mock-server/
├── server.ts          # WS + REST сервер (ws + express)
├── handlers/
│   ├── lobby.ts       # join, lobby_update
│   ├── game.ts        # start, turn, block_position, score_update, game_over
│   ├── attacks.ts     # attack, attack_applied, energy_update
│   └── questions.ts   # generate, questions_ready (захардкоженные)
└── data/
    └── questions.json # 30 захардкоженных вопросов
```

Имитирует полный game loop: смену игроков, падение блока (100мс тики), энергию, атаки, таймер.

---

## 9. Инструкции для бэкендера

### Что нужно от бэка

1. **REST эндпоинты** (из API.md):
   - `GET /health` — healthcheck
   - `POST /api/sessions` — создание/получение текущей сессии
   - `GET /api/sessions/:sessionId` — статус сессии

2. **WebSocket** `WS /ws/:sessionId?name=ИмяИгрока`:
   - Первый подключившийся = Host
   - Подключение без `name` = режим наблюдателя (для `/screen`)
   - `/screen` подключается с `name=__screen__` (зарезервированное имя, бэк не добавляет в список игроков)

3. **CORS** — бэк должен разрешить:
   - `Origin: *` (или конкретный домен фронта)
   - `Methods: GET, POST, OPTIONS`
   - `Headers: Content-Type`

4. **Один sessionId** — `POST /api/sessions` всегда возвращает один и тот же sessionId пока игра не finished. После `finished` — создаёт новый при следующем запросе.

5. **Реконнект** — при повторном WS подключении с тем же `name` к активной сессии, сервер должен восстановить игрока (его очки, позицию в очереди), а не создавать нового. Состояние игрока держать минимум 30 секунд после дисконнекта.

6. **`block_position`** — сервер отправляет каждые 100мс, значение 0-100 (процент пути блока от верха до дна). Клиент только рендерит, не вычисляет.

7. **`attack_applied`** — обязательно включать `durationMs` для эффектов с длительностью (`lock_input`: 4000, `hide_part`: 5000, `hide_all`: 5000).

8. **`game_over`** — включать `place` (1-based) для каждого игрока, отсортированных по очкам.

### Переменные окружения для Docker

Фронтенд принимает:

| Переменная | Дефолт | Описание |
|-----------|--------|----------|
| `API_URL` | `http://localhost:8080` | REST API бэкенда |
| `WS_URL` | `ws://localhost:8080` | WebSocket бэкенда |

### Порядок запуска

```bash
# 1. Бэкенд
docker run -p 8080:8080 standup-speedrun-backend

# 2. Фронтенд
docker run -e API_URL=http://<backend-host>:8080 -e WS_URL=ws://<backend-host>:8080 -p 80:80 standup-speedrun-frontend
```

Или через docker-compose на VPS — оба контейнера в одной сети.

---

## 10. Отличия от PRD

Спека основана на API.md бэкендера как источнике правды. Расхождения с PRD:

| PRD | Спека / API.md | Причина |
|-----|---------------|---------|
| WS событие `join` с `{name}` | Имя в query param: `?name=...` | API бэкендера, упрощает подключение |
| Атаки: `block`, `lock` | `add_block`, `lock_input` | API бэкендера, более явные имена |
| 3 статуса (lobby/active/finished) | 5 статусов (+waiting, +ready) | API бэкендера, лучше отражает flow генерации |
| `titles` как отдельный `Record<string, string>` | `title` поле внутри каждого `PlayerResult` | API бэкендера |
