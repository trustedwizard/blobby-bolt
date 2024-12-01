import { Position } from './common';

export interface GameObject {
  id: string;
  x: number;
  y: number;
  radius?: number;
}

export interface AIBlob {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: number;
  name: string;
  score: number;
  teamId?: string;
  isAI: boolean;
  trail: Position[];
} 