import { PerformanceMonitor } from '../utils/performance';
import { ObjectPool } from '../utils/objectPool';
import { SpatialHash } from '../utils/spatialHash';
import { CullingSystem } from './CullingSystem';
import { MemoryManager } from './MemoryManager';
import { GameObject } from '../types/gameObjects';
import * as PIXI from 'pixi.js';

interface OptimizationState {
  particleCount: number;
  trailLength: number;
  renderQuality: 'low' | 'medium' | 'high';
  cullingDistance: number;
  batchSize: number;
  updateFrequency: number;
}

interface AdvancedOptimizationState extends OptimizationState {
  networkBatchSize: number;
  stateCompressionEnabled: boolean;
  priorityQueue: PriorityQueue<UpdateEvent>;
  compressionLevel: 'none' | 'low' | 'high';
  networkThrottling: boolean;
  adaptiveQuality: boolean;
}

interface UpdateEvent {
  type: 'position' | 'collision' | 'powerup' | 'team';
  priority: number;
  timestamp: number;
  data: {
    id: string;
    x?: number;
    y?: number;
    teamId?: string;
    score?: number;
    effect?: string;
  };
}

class PriorityQueue<T extends UpdateEvent> {
  private items: T[] = [];

  enqueue(item: T): void {
    this.items.push(item);
    this.items.sort((a, b) => b.priority - a.priority);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  peek(): T | undefined {
    return this.items[0];
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

export class PerformanceManager {
  private static instance: PerformanceManager;
  private spatialHash: SpatialHash;
  private particlePool: ObjectPool<PIXI.Graphics>;
  private foodPool: ObjectPool<PIXI.Graphics>;
  private cullingSystem: CullingSystem;
  private optimizationState: OptimizationState;
  private memoryManager: MemoryManager;
  private advancedState: AdvancedOptimizationState;
  private updateQueue: PriorityQueue<UpdateEvent>;

  private constructor(renderer: PIXI.Renderer) {
    this.spatialHash = new SpatialHash(200);
    this.memoryManager = MemoryManager.getInstance();
    this.cullingSystem = new CullingSystem();
    
    // Initialize pools
    this.particlePool = new ObjectPool<PIXI.Graphics>(
      () => new PIXI.Graphics(),
      (particle) => particle.destroy(),
      50,
      200
    );

    this.foodPool = new ObjectPool<PIXI.Graphics>(
      () => new PIXI.Graphics(),
      (food) => food.destroy(),
      100,
      500
    );
    
    // Initialize optimization state
    this.optimizationState = {
      particleCount: 100,
      trailLength: 20,
      renderQuality: 'high',
      cullingDistance: 1000,
      batchSize: 100,
      updateFrequency: 16
    };

    this.updateQueue = new PriorityQueue<UpdateEvent>();
    this.advancedState = {
      ...this.optimizationState,
      networkBatchSize: 10,
      stateCompressionEnabled: true,
      priorityQueue: new PriorityQueue<UpdateEvent>(),
      compressionLevel: 'low',
      networkThrottling: false,
      adaptiveQuality: true
    };
  }

  public static getInstance(renderer: PIXI.Renderer): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager(renderer);
    }
    return PerformanceManager.instance;
  }

  public startFrame(): void {
    PerformanceMonitor.startFrame();
  }

  public endFrame(): void {
    PerformanceMonitor.endFrame();
    
    // Check memory pressure
    const memoryStats = this.memoryManager.getMemoryStats();
    if (memoryStats.heapUsed > memoryStats.heapLimit * 0.9) {
      this.handleHighMemoryPressure();
    }
  }

  public updateSpatialHash(objects: GameObject[]): void {
    this.spatialHash.clear();
    objects.forEach(obj => {
      this.spatialHash.insert(obj.id, obj.x, obj.y);
    });
  }

  public getVisibleObjects<T extends GameObject>(
    objects: T[],
    viewport: { x: number; y: number; width: number; height: number }
  ): T[] {
    const viewportCenter = {
      x: viewport.x + viewport.width / 2,
      y: viewport.y + viewport.height / 2
    };

    return this.cullingSystem.getVisibleObjects(
      objects,
      viewportCenter,
      this.optimizationState.cullingDistance,
      PerformanceMonitor.metrics.fps
    );
  }

  public acquireParticle(): PIXI.Graphics {
    return this.particlePool.acquire();
  }

  public releaseParticle(particle: PIXI.Graphics): void {
    if (!particle.destroyed) {
      this.particlePool.release(particle);
    }
  }

  public acquireFood(): PIXI.Graphics {
    return this.foodPool.acquire();
  }

  public releaseFood(food: PIXI.Graphics): void {
    if (!food.destroyed) {
      this.foodPool.release(food);
    }
  }

  private handleHighMemoryPressure(): void {
    // Clear object pools
    this.particlePool.clear();
    this.foodPool.clear();

    // Force texture cleanup
    this.memoryManager.forceClearCaches();

    // Reduce quality settings
    this.optimizationState.renderQuality = 'low';
    this.optimizationState.particleCount = Math.floor(this.optimizationState.particleCount * 0.5);
    this.optimizationState.trailLength = Math.max(5, Math.floor(this.optimizationState.trailLength * 0.5));
    this.optimizationState.cullingDistance *= 0.8;

    // Reinitialize pools with smaller sizes
    this.particlePool = new ObjectPool<PIXI.Graphics>(
      () => new PIXI.Graphics(),
      (particle) => particle.destroy(),
      50,
      200
    );

    this.foodPool = new ObjectPool<PIXI.Graphics>(
      () => new PIXI.Graphics(),
      (food) => food.destroy(),
      100,
      500
    );

    // Add advanced optimizations
    this.advancedState.networkBatchSize = Math.max(5, this.advancedState.networkBatchSize / 2);
    this.advancedState.compressionLevel = 'high';
    this.advancedState.networkThrottling = true;
  }

  public dispose(): void {
    this.particlePool.clear();
    this.foodPool.clear();
    this.memoryManager.dispose();
    
    // Clear update queue and advanced state
    while (!this.updateQueue.isEmpty()) {
      this.updateQueue.dequeue();
    }
    this.advancedState.priorityQueue = new PriorityQueue<UpdateEvent>();
  }

  public queueUpdate(event: UpdateEvent): void {
    this.updateQueue.enqueue(event);
  }

  public processUpdates(): void {
    while (!this.updateQueue.isEmpty()) {
      const event = this.updateQueue.dequeue();
      if (!event) continue;

      try {
        switch (event.type) {
          case 'position':
            this.processPositionUpdate(event.data);
            break;
          case 'collision':
            this.processCollisionEvent(event.data);
            break;
          case 'powerup':
            this.processPowerUpEvent(event.data);
            break;
          case 'team':
            this.processTeamEvent(event.data);
            break;
        }
      } catch (error) {
        console.error(`Error processing update event: ${event.type}`, error);
      }
    }
  }

  private processPositionUpdate(data: UpdateEvent['data']): void {
    if (!data.x || !data.y) return;
    this.spatialHash.insert(data.id, data.x, data.y);
  }

  private processCollisionEvent(data: UpdateEvent['data']): void {
    if (!data.id) return;

    // Handle collision effects
    const blob = this.spatialHash.get(data.id);
    if (!blob) return;

    // Update spatial hash with new position if provided
    if (data.x !== undefined && data.y !== undefined) {
      this.spatialHash.update(data.id, data.x, data.y);
    }

    // Add collision to priority queue for visual effects
    if (data.effect) {
      this.advancedState.priorityQueue.enqueue({
        type: 'collision',
        priority: 2,
        timestamp: Date.now(),
        data: {
          id: data.id,
          effect: data.effect
        }
      });
    }
  }

  private processPowerUpEvent(data: UpdateEvent['data']): void {
    if (!data.id) return;

    // Handle power-up activation effects
    const blob = this.spatialHash.get(data.id);
    if (!blob) return;

    // Add power-up effect to priority queue
    if (data.effect) {
      this.advancedState.priorityQueue.enqueue({
        type: 'powerup',
        priority: 3, // Higher priority than collisions
        timestamp: Date.now(),
        data: {
          id: data.id,
          effect: data.effect
        }
      });
    }
  }

  private processTeamEvent(data: UpdateEvent['data']): void {
    if (!data.id || !data.teamId) return;

    // Handle team-related updates
    const blob = this.spatialHash.get(data.id);
    if (!blob) return;

    // Update team score if provided
    if (data.score !== undefined) {
      this.advancedState.priorityQueue.enqueue({
        type: 'team',
        priority: 1, // Lower priority than other events
        timestamp: Date.now(),
        data: {
          id: data.id,
          teamId: data.teamId,
          score: data.score
        }
      });
    }
  }

  public updateQualitySettings(fps: number): void {
    if (!this.advancedState.adaptiveQuality) return;

    if (fps < 30) {
      this.advancedState.compressionLevel = 'high';
      this.advancedState.networkThrottling = true;
      this.optimizationState.renderQuality = 'low';
    } else if (fps > 55) {
      this.advancedState.compressionLevel = 'low';
      this.advancedState.networkThrottling = false;
      this.optimizationState.renderQuality = 'high';
    }
  }
} 