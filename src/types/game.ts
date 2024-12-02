import { EntityBase } from './common';

export type GameMode = 'ffa' | 'teams' | 'battle-royale' | 'capture' | 'survival';

export interface GameConfig {
  worldSize: number;
  maxPlayers: number;
  minPlayers: number;
  startDelay: number;
  roundTime: number;
  spawnProtectionTime: number;
  respawnDelay: number;
  initialRadius: number;
  maxBlobSize: number;
  minSplitSize: number;
  splitForce: number;
  ejectForce: number;
  friction: number;
  tickRate: number;
  mapBounds: {
    width: number;
    height: number;
  };
}

export interface Room {
  id: string;
  name: string;
  players: Map<string, Player>;
  teams: Map<string, Team>;
  isPrivate: boolean;
  password?: string;
  maxPlayers: number;
  minPlayers: number;
  gameMode: GameMode;
  config: GameConfig;
  state: RoomState;
  createdAt: number;
  startTime?: number;
  endTime?: number;
}

export interface Player {
  id: string;
  name: string;
  teamId?: string;
  isReady: boolean;
  isConnected: boolean;
  lastPing: number;
  stats: PlayerStats;
}

export interface PlayerStats {
  score: number;
  kills: number;
  deaths: number;
  foodEaten: number;
  timeAlive: number;
  highestMass: number;
  maxCombo: number;
  powerUpsCollected: number;
}

export interface Team {
  id: string;
  name: string;
  color: number;
  players: Set<string>;
  score: number;
  objectives?: Map<string, boolean>;
}

export type RoomState = 'waiting' | 'starting' | 'playing' | 'ended';

export interface Food extends EntityBase {
  type: 'food';
  size: number;
  color: number;
  value: number;
  foodType: FoodType;
}

export type FoodType = 'normal' | 'golden' | 'poison' | 'rainbow' | 'explosive';

export interface PowerUp extends EntityBase {
  type: 'powerup';
  powerUpType: string;
  radius: number;
  color: number;
  duration: number;
  multiplier?: number;
  stackable: boolean;
  maxStacks?: number;
  effect: PowerUpEffect;
}

export interface PowerUpEffect {
  type: string;
  value: number;
  duration: number;
}

export interface Obstacle extends EntityBase {
  type: 'obstacle';
  obstacleType: ObstacleType;
  width: number;
  height: number;
  rotation: number;
  color: number;
  solid: boolean;
  destructible: boolean;
  health?: number;
  currentHealth?: number;
  damage?: number;
  effect?: ObstacleEffect;
}

export type ObstacleType = 'wall' | 'spike' | 'breakable' | 'slime' | 'teleporter';

export interface ObstacleEffect {
  type: string;
  value: number;
  duration?: number;
}

export interface GameEvent {
  type: GameEventType;
  data: any;
  timestamp: number;
}

export type GameEventType = 
  | 'player_join'
  | 'player_leave'
  | 'player_death'
  | 'player_respawn'
  | 'player_split'
  | 'player_merge'
  | 'food_collected'
  | 'powerup_collected'
  | 'obstacle_collision'
  | 'team_score'
  | 'game_start'
  | 'game_end'
  | 'achievement_earned';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  type: AchievementType;
  requirement: number;
  reward?: AchievementReward;
}

export type AchievementType = 
  | 'score'
  | 'mass'
  | 'food'
  | 'kills'
  | 'survival'
  | 'combo'
  | 'powerups'
  | 'team';

export interface AchievementReward {
  type: 'skin' | 'trail' | 'emoji' | 'title';
  value: string;
}