export interface HUDState {
  score: number;
  rank: number;
  fps: number;
  ping: number;
  activePowerUps: PowerUpDisplay[];
  leaderboard: LeaderboardEntry[];
}

export interface PowerUpDisplay {
  id: string;
  type: string;
  timeRemaining: number;
  duration: number;
  icon: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  isPlayer: boolean;
}

export interface MinimapData {
  playerPosition: { x: number; y: number };
  visiblePlayers: Array<{ x: number; y: number; color: string }>;
  powerUps: Array<{ x: number; y: number; type: string }>;
} 