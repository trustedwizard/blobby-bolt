export interface Position {
  x: number;
  y: number;
} 

export interface Blob {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: number;
  name: string;
  emoji: string;
  trail: Position[];
  score: number;
  teamId?: string;
  lastCollisionTime?: number;
  splitVelocity?: { x: number; y: number };
  canMerge?: boolean;
  parentId?: string;
  lastSplitTime?: number;
  lastEjectTime?: number;
  lastRadius: number;
  velocity?: {
    x: number;
    y: number;
  };
} 