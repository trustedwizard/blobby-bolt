import { Position } from '../types/common';
import { BaseSystem } from './BaseSystem';

interface GridRegion {
  x: number;
  y: number;
  objects: Set<string>;
}

export class MapSystem extends BaseSystem {
  protected static override instance: MapSystem;
  private gridSize: number;
  private regions: Map<string, GridRegion>;
  private visibleRegions: Set<string>;
  private worldSize: number;

  private constructor(worldSize: number, gridSize: number = 200) {
    super();
    this.worldSize = worldSize;
    this.gridSize = gridSize;
    this.regions = new Map();
    this.visibleRegions = new Set();
    this.initializeGrid();
  }

  public static override getInstance(worldSize: number = 4000): MapSystem {
    if (!MapSystem.instance) {
      MapSystem.instance = new MapSystem(worldSize);
    }
    return MapSystem.instance;
  }

  private initializeGrid() {
    const regionsPerSide = Math.ceil(this.worldSize / this.gridSize);
    for (let x = 0; x < regionsPerSide; x++) {
      for (let y = 0; y < regionsPerSide; y++) {
        const regionKey = this.getRegionKey(x, y);
        this.regions.set(regionKey, {
          x: x * this.gridSize,
          y: y * this.gridSize,
          objects: new Set()
        });
      }
    }
  }

  private getRegionKey(x: number, y: number): string {
    return `${Math.floor(x / this.gridSize)},${Math.floor(y / this.gridSize)}`;
  }

  updateVisibleRegions(viewport: { x: number; y: number; width: number; height: number }) {
    this.visibleRegions.clear();
    const buffer = this.gridSize; // Add one region buffer

    const startX = Math.max(0, viewport.x - buffer);
    const startY = Math.max(0, viewport.y - buffer);
    const endX = Math.min(this.worldSize, viewport.x + viewport.width + buffer);
    const endY = Math.min(this.worldSize, viewport.y + viewport.height + buffer);

    for (let x = startX; x < endX; x += this.gridSize) {
      for (let y = startY; y < endY; y += this.gridSize) {
        this.visibleRegions.add(this.getRegionKey(x, y));
      }
    }
  }

  updateObjectPosition(id: string, oldPos: Position | null, newPos: Position) {
    if (oldPos) {
      const oldRegionKey = this.getRegionKey(oldPos.x, oldPos.y);
      this.regions.get(oldRegionKey)?.objects.delete(id);
    }

    const newRegionKey = this.getRegionKey(newPos.x, newPos.y);
    this.regions.get(newRegionKey)?.objects.add(id);
  }

  isVisible(position: Position): boolean {
    const regionKey = this.getRegionKey(position.x, position.y);
    return this.visibleRegions.has(regionKey);
  }

  getVisibleObjects<T extends { id: string; x: number; y: number }>(objects: T[]): T[] {
    return objects.filter(obj => this.isVisible({ x: obj.x, y: obj.y }));
  }

  protected cleanupResources(): void {
    this.regions.clear();
    this.visibleRegions.clear();
  }
} 