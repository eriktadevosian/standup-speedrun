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
