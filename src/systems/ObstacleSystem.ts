import { Position } from '../types/common';
import { BaseSystem } from './BaseSystem';

interface Obstacle {
  id: string;
  x: number;
  y: number;
  radius: number;
  type: 'rock' | 'wall';
  friction: number;
}

interface BounceEffect {
  angle: number;
  force: number;
  position: Position;
  friction: number;
}

export class ObstacleSystem extends BaseSystem {
  protected static override instance: ObstacleSystem;
  private obstacles: Map<string, Obstacle> = new Map();
  private readonly BOUNCE_FORCE = 5;
  private readonly COLLISION_ELASTICITY = 0.6;

  private constructor() {
    super();
    this.generateObstacles();
  }

  public static override getInstance(): ObstacleSystem {
    if (!ObstacleSystem.instance) {
      ObstacleSystem.instance = new ObstacleSystem();
    }
    return ObstacleSystem.instance;
  }

  private generateObstacles(): void {
    const rockPositions = [
      { x: 1000, y: 1000, type: 'rock' as const, friction: 0.8 },
      { x: 3000, y: 3000, type: 'rock' as const, friction: 0.8 },
      { x: 2000, y: 2000, type: 'wall' as const, friction: 0.9 },
      // Add more strategic positions
    ];

    rockPositions.forEach((pos, index) => {
      this.obstacles.set(`${pos.type}-${index}`, {
        id: `${pos.type}-${index}`,
        x: pos.x,
        y: pos.y,
        radius: pos.type === 'rock' ? 50 + Math.random() * 50 : 100,
        type: pos.type,
        friction: pos.friction
      });
    });
  }

  public handleCollision(blob: { 
    x: number; 
    y: number; 
    radius: number;
    velocity?: { x: number; y: number } 
  }): BounceEffect | null {
    for (const obstacle of this.obstacles.values()) {
      const dx = obstacle.x - blob.x;
      const dy = obstacle.y - blob.y;
      const distance = Math.hypot(dx, dy);
      const minDistance = blob.radius + obstacle.radius;

      if (distance < minDistance) {
        const angle = Math.atan2(dy, dx);
        const overlap = minDistance - distance;
        
        // Calculate bounce force based on velocity if available
        let force = this.BOUNCE_FORCE;
        if (blob.velocity) {
          const speed = Math.hypot(blob.velocity.x, blob.velocity.y);
          force = speed * this.COLLISION_ELASTICITY;
        }

        // Apply overlap correction to prevent sticking
        const correctionX = Math.cos(angle) * overlap;
        const correctionY = Math.sin(angle) * overlap;

        return {
          angle: angle + Math.PI, // Reverse angle for bounce
          force: force * (1 - distance / minDistance),
          position: { 
            x: blob.x - correctionX, 
            y: blob.y - correctionY 
          },
          friction: obstacle.friction
        };
      }
    }
    return null;
  }

  public getObstacles(): Obstacle[] {
    return Array.from(this.obstacles.values());
  }

  protected cleanupResources(): void {
    this.obstacles.clear();
  }
} 