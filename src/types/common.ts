import { GameMode, Food, PowerUp, Obstacle } from './game';
import { PowerUpType } from './powerups';

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export interface EntityBase {
  id: string;
  x: number;
  y: number;
  type: EntityType;
}

export type EntityType = 'player' | 'food' | 'powerup' | 'obstacle';

export interface Blob extends EntityBase {
  type: 'player';
  radius: number;
  color: number;
  name: string;
  emoji?: string;
  trail: Position[];
  score: number;
  teamId?: string;
  mass: number;
  isGhost?: boolean;
  shield?: boolean;
  pointMultiplier?: number;
  speedMultiplier?: number;
  damageReduction?: number;
  splitCooldownMultiplier?: number;
  
  // Collision and physics
  velocity: Velocity;
  lastCollisionTime?: number;
  lastSplitTime?: number;
  lastEjectTime?: number;
  lastMergeTime?: number;
  canMerge?: boolean;
  
  // Split mechanics
  parentId?: string;
  childIds?: string[];
  splitVelocity?: Velocity;
  
  // State tracking
  lastRadius: number;
  spawnTime: number;
  lastUpdateTime: number;
  isDead?: boolean;
  
  // Power-up effects
  activePowerUps?: ActivePowerUpState[];
  
  // Team mechanics
  teamBoostActive?: boolean;
  teamBoostCooldown?: number;
  
  // Achievements and stats
  totalFoodEaten?: number;
  totalPlayersEaten?: number;
  longestSurvivalTime?: number;
  highestMass?: number;
  currentCombo?: number;
  maxCombo?: number;
}

export interface ActivePowerUpState {
  type: PowerUpType;
  startTime: number;
  duration: number;
  multiplier?: number;
  stacks?: number;
}

export interface GridCell {
  x: number;
  y: number;
}

export interface CollisionResult {
  collision: boolean;
  damage?: number;
  effect?: PowerUpEffect;
  bounce?: {
    x: number;
    y: number;
  };
}

export interface PowerUpEffect {
  type: PowerUpType;
  multiplier?: number;
  duration: number;
  stacks?: number;
}

export interface GameState {
  players: Map<string, Blob>;
  food: Map<string, Food>;
  powerUps: Map<string, PowerUp>;
  obstacles: Map<string, Obstacle>;
  teams: Map<string, Team>;
  leaderboard: LeaderboardEntry[];
  worldSize: number;
  gameMode: GameMode;
  timeLeft?: number;
}

export interface Team {
  id: string;
  name: string;
  color: number;
  score: number;
  players: string[];
  powerUpBonus?: number;
  scoreMultiplier?: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  teamId?: string;
  rank?: number;
  isPlayer?: boolean;
} 