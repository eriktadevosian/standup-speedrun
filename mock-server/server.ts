import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

// CORS
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') { res.sendStatus(200); return; }
  next();
});

const server = createServer(app);
const wss = new WebSocketServer({ server });

const SESSION_ID = '00000000-0000-0000-0000-000000000001';
const questions: string[] = JSON.parse(readFileSync(join(__dirname, 'data/questions.json'), 'utf-8'));

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  ws: WebSocket;
  score: number;
  answersCount: number;
  missedCount: number;
  energySpent: number;
  likesGiven: number;
}

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
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.post('/api/sessions', (_req, res) => res.status(201).json({ sessionId: SESSION_ID }));
app.get('/api/sessions/:id', (_req, res) => res.json({ sessionId: SESSION_ID, status, playerCount: players.length, maxPlayers: 10 }));

function broadcast(msg: object) {
  const data = JSON.stringify(msg);
  for (const p of players) {
    if (p.ws.readyState === WebSocket.OPEN) p.ws.send(data);
  }
}

function sendTo(ws: WebSocket, msg: object) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function lobbyUpdate() {
  broadcast({
    type: 'lobby_update',
    payload: { players: players.map(p => ({ id: p.id, name: p.name, isHost: p.isHost })) }
  });
}

function scoreUpdate() {
  broadcast({
    type: 'score_update',
    payload: { players: players.map(p => ({ id: p.id, name: p.name, score: p.score, answersCount: p.answersCount, missedCount: p.missedCount })) }
  });
}

function nextTurn() {
  if (status !== 'active') return;
  const gamePlayers = players.filter(p => p.name !== '__screen__');
  if (gamePlayers.length === 0) return;
  if (questionIndex >= questions.length) { endGame(); return; }

  const player = gamePlayers[currentPlayerIndex % gamePlayers.length];
  broadcast({
    type: 'turn',
    payload: { activePlayerId: player.id, question: questions[questionIndex], blockDurationMs: BLOCK_DURATION }
  });
  questionIndex++;
  blockStart = Date.now();

  if (blockInterval) clearInterval(blockInterval);
  blockInterval = setInterval(() => {
    const elapsed = Date.now() - blockStart;
    const pos = Math.min((elapsed / BLOCK_DURATION) * 100, 100);
    broadcast({ type: 'block_position', payload: { position: Math.round(pos * 10) / 10 } });
    if (pos >= 100) {
      clearInterval(blockInterval!);
      blockInterval = null;
      player.missedCount++;
      for (const p of gamePlayers) p.score = Math.max(0, p.score - 5);
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

  const gamePlayers = players.filter(p => p.name !== '__screen__');
  const sorted = [...gamePlayers].sort((a, b) => b.score - a.score);
  const titles = ['🚀 10x Developer', '😈 Главный саботажник', '🛡️ Командный игрок', '🧱 Блокер команды', '☕ Проснулся к концу'];
  const results = sorted.map((p, i) => ({
    id: p.id, name: p.name, score: p.score, title: titles[i % titles.length],
    answersCount: p.answersCount, missedCount: p.missedCount,
    energySpent: p.energySpent, likesGiven: p.likesGiven, place: i + 1,
  }));
  broadcast({ type: 'game_over', payload: { players: results } });
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url!, 'http://localhost');
  const name = url.searchParams.get('name') || 'Anon';

  // Observer mode for screen
  if (name === '__screen__') {
    const screenPlayer: Player = { id: '__screen__', name: '__screen__', isHost: false, ws, score: 0, answersCount: 0, missedCount: 0, energySpent: 0, likesGiven: 0 };
    players.push(screenPlayer);
    // Send current state
    lobbyUpdate();
    ws.on('close', () => { players = players.filter(p => p.id !== '__screen__'); });
    return;
  }

  if (players.filter(p => p.name !== '__screen__').length >= 10) {
    sendTo(ws, { type: 'error', payload: { message: 'session full', code: 'SESSION_FULL' } });
    ws.close();
    return;
  }

  const id = `player-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const isHost = players.filter(p => p.name !== '__screen__').length === 0;
  const player: Player = { id, name, isHost, ws, score: 0, answersCount: 0, missedCount: 0, energySpent: 0, likesGiven: 0 };
  players.push(player);
  console.log(`Player joined: ${name} (${id}), host: ${isHost}`);
  lobbyUpdate();

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      switch (msg.type) {
        case 'generate':
          if (!player.isHost) { sendTo(ws, { type: 'error', payload: { message: 'not host', code: 'NOT_HOST' } }); break; }
          status = 'waiting';
          console.log('Generating questions...');
          setTimeout(() => { status = 'ready'; broadcast({ type: 'questions_ready', payload: {} }); console.log('Questions ready!'); }, 2000);
          break;

        case 'start':
          if (!player.isHost || status !== 'ready') {
            sendTo(ws, { type: 'error', payload: { message: 'invalid status', code: 'INVALID_STATUS' } });
            break;
          }
          status = 'active';
          energy = 100;
          const endsAt = new Date(Date.now() + GAME_DURATION * 1000).toISOString();
          broadcast({ type: 'game_start', payload: { endsAt, durationSeconds: GAME_DURATION } });
          console.log('Game started!');
          gameTimer = setTimeout(() => endGame(), GAME_DURATION * 1000);
          energyInterval = setInterval(() => {
            energy = Math.min(100, energy + 5);
            broadcast({ type: 'energy_update', payload: { energy } });
          }, 2000);
          questionIndex = 0;
          currentPlayerIndex = 0;
          nextTurn();
          break;

        case 'answer': {
          const gamePlayers = players.filter(p => p.name !== '__screen__');
          if (gamePlayers[currentPlayerIndex % gamePlayers.length]?.id !== player.id) {
            sendTo(ws, { type: 'error', payload: { message: 'not your turn', code: 'NOT_YOUR_TURN' } });
            break;
          }
          if (blockInterval) clearInterval(blockInterval);
          blockInterval = null;
          player.score += 25;
          player.answersCount++;
          console.log(`${player.name} answered! Score: ${player.score}`);
          scoreUpdate();
          currentPlayerIndex++;
          nextTurn();
          break;
        }

        case 'attack': {
          const costMap: Record<string, number> = { like: 5, add_block: 20, lock_input: 25, hide_part: 15, hide_all: 30 };
          const cost = costMap[msg.payload.attackType] ?? 0;
          if (energy < cost) {
            sendTo(ws, { type: 'error', payload: { message: 'not enough energy', code: 'INSUFFICIENT_ENERGY' } });
            break;
          }
          energy -= cost;
          player.energySpent += cost;
          if (msg.payload.attackType === 'like') player.likesGiven++;
          const durMap: Record<string, number> = { lock_input: 4000, hide_part: 5000, hide_all: 5000 };
          broadcast({
            type: 'attack_applied',
            payload: { attackType: msg.payload.attackType, attackerId: player.id, targetId: msg.payload.targetId, durationMs: durMap[msg.payload.attackType] ?? 0 }
          });
          broadcast({ type: 'energy_update', payload: { energy } });
          if (msg.payload.attackType === 'like') {
            const target = players.find(p => p.id === msg.payload.targetId);
            if (target) { target.score += 15; scoreUpdate(); }
          }
          console.log(`${player.name} used ${msg.payload.attackType}! Energy: ${energy}`);
          break;
        }
      }
    } catch (e) {
      console.error('Message parse error:', e);
    }
  });

  ws.on('close', () => {
    console.log(`Player left: ${player.name}`);
    players = players.filter(p => p.id !== id);
    if (status === 'lobby' || status === 'ready') lobbyUpdate();
  });
});

const PORT = 8080;
server.listen(PORT, () => console.log(`Mock server running: http://localhost:${PORT}`));
