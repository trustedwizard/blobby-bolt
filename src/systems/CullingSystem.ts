import { Position } from '../types/common';
import { PowerUpType } from '../types/powerups';

interface CullableObject {
  id: string;
  x: number;
  y: number;
  radius?: number;
  type?: PowerUpType;
  score?: number;
  isPlayer?: boolean;
  isAI?: boolean;
  lastCollisionTime?: number;
}

export class CullingSystem {
  private baseViewDistance: number;
  private maxViewDistance: number;
  private dynamicCullingEnabled: boolean;
  private readonly performanceThreshold: number;
  private currentViewDistance: number;
  private lastPerformanceCheck: number = 0;
  private readonly checkInterval: number = 1000; // Check every second

  private readonly PRIORITY_WEIGHTS = {
    SIZE: 0.4,
    DISTANCE: 0.3,
    THREAT: 0.2,
    OPPORTUNITY: 0.1
  };

  constructor(
    baseViewDistance: number = 1000,
    maxViewDistance: number = 2000,
    initialDynamicCulling: boolean = true,
    performanceThreshold: number = 45 // FPS threshold
  ) {
    this.baseViewDistance = baseViewDistance;
    this.maxViewDistance = maxViewDistance;
    this.dynamicCullingEnabled = initialDynamicCulling;
    this.performanceThreshold = performanceThreshold;
    this.currentViewDistance = baseViewDistance;
  }

  public getVisibleObjects<T extends CullableObject>(
    objects: T[],
    viewportCenter: Position,
    playerRadius: number,
    currentFPS: number
  ): T[] {
    // Adjust view distance based on performance
    this.adjustViewDistance(currentFPS, playerRadius);

    // Priority-based culling
    return objects.filter(obj => {
      const distance = this.getDistance(viewportCenter, obj);
      const priority = this.getObjectPriority(obj, playerRadius, viewportCenter);
      return this.isObjectVisible(distance, priority);
    }).sort((a, b) => {
      // Sort by distance for rendering order
      const distA = this.getDistance(viewportCenter, a);
      const distB = this.getDistance(viewportCenter, b);
      return distA - distB;
    });
  }

  private adjustViewDistance(currentFPS: number, playerRadius: number) {
    const now = Date.now();
    if (now - this.lastPerformanceCheck < this.checkInterval) return;

    this.lastPerformanceCheck = now;

    if (!this.dynamicCullingEnabled) {
      this.currentViewDistance = this.baseViewDistance;
      return;
    }

    // Adjust view distance based on FPS and player size
    if (currentFPS < this.performanceThreshold) {
      this.currentViewDistance = Math.max(
        this.baseViewDistance * 0.8,
        this.currentViewDistance - 100
      );
    } else if (currentFPS > this.performanceThreshold + 10) {
      this.currentViewDistance = Math.min(
        this.maxViewDistance,
        this.currentViewDistance + 50
      );
    }

    // Scale with player size
    const sizeMultiplier = 1 + (playerRadius / 100);
    this.currentViewDistance *= sizeMultiplier;
  }

  private getObjectPriority(obj: CullableObject, playerRadius: number, playerPos: Position): number {
    let priority = 1;

    // Size-based priority
    if (obj.radius) {
      const sizeRatio = obj.radius / playerRadius;
      priority += this.PRIORITY_WEIGHTS.SIZE * sizeRatio;
    }

    // Distance-based priority (closer objects get higher priority)
    const distance = this.getDistance(playerPos, obj);
    const distanceFactor = Math.max(0, 1 - (distance / this.currentViewDistance));
    priority += this.PRIORITY_WEIGHTS.DISTANCE * distanceFactor;

    // Threat assessment
    if (obj.radius && obj.radius > playerRadius * 1.2) {
      const threatLevel = obj.radius / playerRadius;
      priority += this.PRIORITY_WEIGHTS.THREAT * threatLevel;
    }

    // Opportunity assessment
    if (obj.radius && obj.radius < playerRadius * 0.8) {
      const opportunityLevel = playerRadius / obj.radius;
      priority += this.PRIORITY_WEIGHTS.OPPORTUNITY * opportunityLevel;
    }

    // Special object type priorities
    if (obj.type) {
      priority += this.getPowerUpPriority(obj.type, playerRadius);
    }

    // Recent collision priority
    if (obj.lastCollisionTime) {
      const timeSinceCollision = Date.now() - obj.lastCollisionTime;
      if (timeSinceCollision < 5000) { // 5 seconds
        priority += 0.5; // Increase priority for recently collided objects
      }
    }

    return priority;
  }

  private getPowerUpPriority(type: PowerUpType, playerRadius: number): number {
    switch (type) {
      case PowerUpType.SHIELD:
        return playerRadius < 50 ? 2 : 1; // Higher priority when small
      case PowerUpType.SPEED_BOOST:
        return 1.5;
      case PowerUpType.BLOB_MAGNET:
        return playerRadius < 40 ? 1.8 : 1;
      case PowerUpType.GRAVITY_PULSE:
        return playerRadius > 100 ? 1.8 : 1;
      case PowerUpType.TELEPORT:
        return 1.3;
      case PowerUpType.SPLIT_BOMB:
        return playerRadius > 80 ? 1.6 : 1;
      default:
        return 1;
    }
  }

  private isObjectVisible(distance: number, priority: number): boolean {
    // Base visibility check
    if (distance <= this.currentViewDistance) return true;

    // Extended range for high-priority objects
    const extendedRange = this.currentViewDistance * (1 + (priority * 0.2));
    return distance <= extendedRange;
  }

  private getDistance(pos1: Position, pos2: Position): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public getCurrentViewDistance(): number {
    return this.currentViewDistance;
  }

  public getDynamicCullingEnabled(): boolean {
    return this.dynamicCullingEnabled;
  }

  public setDynamicCullingEnabled(enabled: boolean): void {
    this.dynamicCullingEnabled = enabled;
  }
} 