export interface Position {
  x: number;
  y: number;
}

export interface Room {
  id: string;
  name: string;
  players: string[];
  teams: Team[];
  isPrivate: boolean;
  password?: string;
  maxPlayers: number;
  gameMode: GameMode;
}

export interface Team {
  id: string;
  name: string;
  color: number;
  players: string[];
  score: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  wins: number;
  gamesPlayed: number;
}

export type GameMode = 'ffa' | 'teams' | 'battle-royale';

export interface Blob {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: number;
  name: string;
  score: number;
  velocity?: {
    x: number;
    y: number;
  };
}

export interface Food {
  id: string;
  x: number;
  y: number;
  size: number;
  color: number;
  type: 'normal' | 'power' | 'ejected';
}