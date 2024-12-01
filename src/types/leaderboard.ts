export interface LeaderboardUpdate {
  comboType: string;
  leaderboard: LeaderboardEntry[];
}

export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  activations: number;
  successRate: number;
  lastActivation: number;
}

export interface ComboStats {
  activations: number;
  successfulHits: number;
  totalDamage: number;
  lastActivation: number;
} 