import { AttackType } from './attack.model';
import { PlayerInfo, PlayerScore, PlayerResult } from './player.model';

export type WsClientEvent =
  | { type: 'generate'; payload: { context: string } }
  | { type: 'start';    payload: Record<string, never> }
  | { type: 'answer';   payload: { text: string } }
  | { type: 'attack';   payload: { attackType: AttackType; targetId: string } };

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
