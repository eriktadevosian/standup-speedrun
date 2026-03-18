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
