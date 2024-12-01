import { Position } from './common';

export interface PowerUpEffect {
  position: Position;
  color: number;
  size: number;
}

export interface CollisionEffect {
  position: Position;
  color: number;
  force: number;
}

export interface GrowthEffect {
  position: Position;
  color: number;
  scale: number;
} 