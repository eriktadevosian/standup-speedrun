# Standup Speedrun — API Documentation

> Base URL: `https://plata.all-easy.org`
> WebSocket URL: `wss://plata.all-easy.org`
> Prefix: `/api/v1`

---

## REST Endpoints

### GET /health
Healthcheck.

**Response 200:**
```json
{ "status": "ok" }
```

---

### POST /api/sessions
Создать новую игровую сессию. Возвращает `sessionID` для передачи остальным игрокам.

**Response 201:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "code": "XK4B2R"
}
```

---

### GET /api/sessions/:sessionId
Получить текущий статус сессии (полезно перед WS-подключением).

**Response 200:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "code": "XK4B2R",
  "status": "lobby",
  "players": [
    { "id": "uuid", "name": "Денис", "isHost": true },
    { "id": "uuid", "name": "Саша", "isHost": false }
  ],
  "playerCount": 2,
  "maxPlayers": 10
}
```

> `sessionId` можно заменить на короткий `code` — оба варианта работают:
> `GET /api/v1/sessions/XK4B2R` и `GET /api/v1/sessions/550e8400-...` — одинаково.

**Статусы сессии:**
| Статус | Описание |
|--------|----------|
| `lobby` | Ждём игроков, Host ещё не генерировал вопросы |
| `waiting` | Идёт генерация вопросов через LLM |
| `ready` | Вопросы готовы, Host может начать игру |
| `active` | Игра идёт |
| `finished` | Игра завершена |

**Response 404:**
```json
{ "error": "session not found" }
```

---

## WebSocket

### Подключение
```
WS /ws/:sessionId?name=ИмяИгрока
```

- `sessionId` — из POST /api/sessions
- `name` — имя игрока (обязательно, 1-20 символов)

Первый подключившийся автоматически становится **Host**.

**Пример:**
```
ws://localhost:8080/ws/550e8400-e29b-41d4-a716-446655440000?name=Денис
```

---

### Формат сообщений

Все сообщения — JSON.

**Входящие (Client → Server):**
```json
{
  "type": "<EventType>",
  "payload": { ... }
}
```

**Исходящие (Server → Client):**
```json
{
  "type": "<EventType>",
  "payload": { ... }
}
```

---

## Входящие события (Client → Server)

### `generate`
Только Host. Запустить генерацию вопросов через LLM.

```json
{
  "type": "generate",
  "payload": {
    "context": "Мы делаем CRM для банка, backend на Go"
  }
}
```
> `context` необязателен. Дефолт: `"IT команда разработчиков"`

**Ответ сервера:** `questions_ready` или `error`

---

### `start`
Только Host. Начать игру (доступно только в статусе `ready`).

```json
{
  "type": "start",
  "payload": {}
}
```

**Ответ сервера:** `game_start` broadcast всем

---

### `answer`
Только активный игрок. Отправить ответ на текущий вопрос.

```json
{
  "type": "answer",
  "payload": {
    "text": "Вчера фиксил баги, сегодня буду фиксить баги"
  }
}
```
> Любой непустой текст засчитывается. Проверка на сервере.

---

### `attack`
Любой игрок кроме активного. Применить атаку/поддержку.

```json
{
  "type": "attack",
  "payload": {
    "attackType": "lock_input",
    "targetId": "player-uuid"
  }
}
```

**Типы атак:**

| `attackType` | Описание | Стоимость энергии | Эффект |
|-------------|----------|------------------|--------|
| `like` | Лайк активному игроку | 5 | +15 очков цели |
| `add_block` | Добавить лишний блок | 20 | Следующий вопрос прилетит сразу после текущего |
| `lock_input` | Заблокировать ввод | 25 | Поле ввода недоступно 4 секунды |
| `hide_part` | Скрыть часть вопроса | 15 | 50% текста → `░░░` на 5 секунд |
| `hide_all` | Скрыть весь вопрос | 30 | Блок невидим 5 секунд |

> Атаки применяются только к **текущему активному игроку** (`targetId` = `activePlayerId` из события `turn`).
> Если энергии недостаточно — сервер вернёт `error`.

---

## Исходящие события (Server → Client)

### `lobby_update`
Broadcast при каждом подключении/отключении игрока.

```json
{
  "type": "lobby_update",
  "payload": {
    "code": "XK4B2R",
    "players": [
      { "id": "player-uuid", "name": "Денис", "isHost": true },
      { "id": "player-uuid-2", "name": "Саша", "isHost": false }
    ]
  }
}
```

---

### `questions_ready`
Broadcast когда вопросы успешно сгенерированы. Сессия переходит в `ready`.

```json
{
  "type": "questions_ready",
  "payload": {}
}
```

---

### `game_start`
Broadcast когда Host нажал Start. Сессия переходит в `active`.

```json
{
  "type": "game_start",
  "payload": {
    "endsAt": "2026-03-18T12:03:00Z",
    "durationSeconds": 180
  }
}
```

---

### `turn`
Broadcast при смене активного игрока. Приходит сразу после `game_start` и после каждого ответа/таймаута.

```json
{
  "type": "turn",
  "payload": {
    "activePlayerId": "player-uuid",
    "question": "Что сделал вчера кроме созвонов?",
    "blockDurationMs": 10000
  }
}
```

> `blockDurationMs` — время до того как блок достигнет дна (мс).
> UI должен начать анимацию падения блока при получении этого события.

---

### `block_position`
Broadcast каждые 100мс для активного блока. Используй для синхронизации анимации.

```json
{
  "type": "block_position",
  "payload": {
    "position": 42.5
  }
}
```

> `position` — прогресс падения блока от 0 (сверху) до 100 (дно).

---

### `attack_applied`
Broadcast когда атака успешно применена.

```json
{
  "type": "attack_applied",
  "payload": {
    "attackType": "lock_input",
    "attackerId": "player-uuid-2",
    "targetId": "player-uuid",
    "durationMs": 4000
  }
}
```

> UI должен показать визуальный эффект на экране цели и анимацию атаки на общем экране.

---

### `energy_update`
Broadcast каждые 2 секунды и после каждой атаки.

```json
{
  "type": "energy_update",
  "payload": {
    "energy": 75
  }
}
```

> `energy` — текущий уровень командного пула (0–100).

---

### `score_update`
Broadcast после каждого ответа и после каждого пропущенного блока.

```json
{
  "type": "score_update",
  "payload": {
    "players": [
      {
        "id": "player-uuid",
        "name": "Денис",
        "score": 120,
        "answersCount": 8,
        "missedCount": 1
      }
    ]
  }
}
```

---

### `game_over`
Broadcast когда таймер истёк. Финальные результаты с титулами.

```json
{
  "type": "game_over",
  "payload": {
    "players": [
      {
        "id": "player-uuid",
        "name": "Денис",
        "score": 250,
        "title": "🚀 10x Developer",
        "answersCount": 15,
        "missedCount": 1,
        "energySpent": 20,
        "likesGiven": 3,
        "place": 1
      },
      {
        "id": "player-uuid-2",
        "name": "Саша",
        "score": 180,
        "title": "😈 Главный саботажник",
        "answersCount": 10,
        "missedCount": 2,
        "energySpent": 95,
        "likesGiven": 0,
        "place": 2
      }
    ]
  }
}
```

**Титулы:**

| Титул | Условие |
|-------|---------|
| `🚀 10x Developer` | Больше всех успешных ответов |
| `🧱 Блокер команды` | Больше всех пропущенных блоков |
| `😈 Главный саботажник` | Больше всех потрачено энергии на атаки |
| `🛡️ Командный игрок` | Больше всех использовал `like` |
| `☕ Проснулся к концу` | Самый быстрый ответ в последние 30 сек |

---

### `error`
Личное сообщение игроку (не broadcast) при ошибке.

```json
{
  "type": "error",
  "payload": {
    "message": "not enough energy",
    "code": "INSUFFICIENT_ENERGY"
  }
}
```

**Коды ошибок:**

| Code | Описание |
|------|----------|
| `INSUFFICIENT_ENERGY` | Не хватает энергии для атаки |
| `NOT_YOUR_TURN` | Попытка ответить не в свой ход |
| `NOT_HOST` | Попытка start/generate не будучи Host |
| `INVALID_STATUS` | Действие недоступно в текущем статусе игры |
| `SESSION_FULL` | Сессия переполнена (10 игроков) |
| `SESSION_NOT_FOUND` | Сессия не найдена |

---

## Типичный игровой флоу

```
1. Host:    POST /api/sessions                     → sessionId
2. Host:    WS /ws/:sessionId?name=Host            → lobby_update
3. Players: WS /ws/:sessionId?name=Player1         → lobby_update (broadcast)
4. Host:    send { type: "generate", context: "..." }
5. Server:  → lobby status = "waiting"
6. Server:  → questions_ready (broadcast)
7. Host:    send { type: "start" }
8. Server:  → game_start (broadcast)
9. Server:  → turn { activePlayerId, question } (broadcast)
10. Server: → block_position каждые 100мс
11. Non-active players: send { type: "attack", attackType: "like", targetId }
12. Server: → attack_applied (broadcast)
13. Server: → energy_update (broadcast)
14. Active player: send { type: "answer", text: "..." }
15. Server: → score_update (broadcast)
16. Server: → turn (следующий игрок) (broadcast)
    ... повторяется до истечения таймера ...
17. Server: → game_over (broadcast)
```

---

## Экраны и маршруты (предложение для UI)

| Маршрут | Описание |
|---------|----------|
| `/` | Главная: кнопка "Создать игру" + поле "Войти по коду" |
| `/lobby/:sessionId` | Лобби: список игроков, поле контекста (Host), кнопка Start |
| `/play/:sessionId` | Личный экран игрока во время игры |
| `/screen/:sessionId` | Общий экран для проектора (read-only, без ввода) |
| `/results/:sessionId` | Финальный экран с результатами |
