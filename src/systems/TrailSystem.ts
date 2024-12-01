import { Position } from '../types/common';
import { BaseSystem } from './BaseSystem';

interface TrailEffect {
  id: string;
  positions: Position[];
  color: number;
  opacity: number;
  width: number;
}

export class TrailSystem extends BaseSystem {
  private trails: Map<string, TrailEffect> = new Map();
  private readonly MAX_TRAIL_LENGTH = 20;

  public static getInstance(): TrailSystem {
    if (!TrailSystem.instance) {
      TrailSystem.instance = new TrailSystem();
    }
    return TrailSystem.instance as TrailSystem;
  }

  public dispose(): void {
    this.trails.clear();
    TrailSystem.instance = undefined;
  }

  public removeTrail(blobId: string): void {
    this.trails.delete(blobId);
  }

  public updateTrail(blobId: string, position: Position, speed: number, color: number): void {
    let trail = this.trails.get(blobId);
    
    if (!trail) {
      trail = {
        id: blobId,
        positions: [],
        color,
        opacity: 1,
        width: 5
      };
      this.trails.set(blobId, trail);
    }

    // Add position pooling for better memory management
    const pooledPosition = { ...position };
    trail.positions.push(pooledPosition);
    
    // Optimize trail length based on speed
    const maxLength = Math.min(this.MAX_TRAIL_LENGTH, Math.max(5, speed / 2));
    while (trail.positions.length > maxLength) {
      trail.positions.shift();
    }

    // Update trail properties based on speed
    trail.opacity = Math.min(1, speed / 10);
    trail.width = Math.max(2, Math.min(8, speed / 2));
  }

  public getTrail(blobId: string): TrailEffect | undefined {
    return this.trails.get(blobId);
  }

  protected cleanupResources(): void {
    this.trails.clear();
  }
} 