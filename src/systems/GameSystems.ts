import { MapSystem } from './MapSystem';
import { QualityManager } from './QualityManager';
import { PerformanceMonitor } from '../utils/performance';

interface QualitySettings {
  particleCount: number;
  trailLength: number;
  shadowQuality: boolean;
  antialiasing: boolean;
  effectDetail: 'low' | 'medium' | 'high';
}

export class GameSystems {
  private static instance: GameSystems;
  private mapSystem: MapSystem;
  private qualityManager: QualityManager;
  private lastFrameTime: number = 0;

  private constructor() {
    this.mapSystem = new MapSystem(4000); // World size of 4000
    this.qualityManager = new QualityManager();
    this.initializeEventListeners();
  }

  public static getInstance(): GameSystems {
    if (!GameSystems.instance) {
      GameSystems.instance = new GameSystems();
    }
    return GameSystems.instance;
  }

  private initializeEventListeners() {
    document.addEventListener('quality-changed', ((event: CustomEvent<QualitySettings>) => {
      this.applyQualitySettings(event.detail);
    }) as EventListener);
  }

  public update(viewport: { x: number; y: number; width: number; height: number }) {
    // Update map regions
    this.mapSystem.updateVisibleRegions(viewport);

    // Calculate FPS
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    const fps = 1000 / delta;
    this.lastFrameTime = now;

    // Update quality based on performance
    this.qualityManager.updateFPS(fps);

    // Update performance metrics
    PerformanceMonitor.metrics.fps = fps;
    PerformanceMonitor.metrics.frameTime = delta;
  }

  public isObjectVisible(x: number, y: number): boolean {
    return this.mapSystem.isVisible({ x, y });
  }

  public getVisibleObjects<T extends { id: string; x: number; y: number }>(objects: T[]): T[] {
    return this.mapSystem.getVisibleObjects(objects);
  }

  public updateObjectPosition(id: string, oldPos: { x: number; y: number } | null, newPos: { x: number; y: number }) {
    this.mapSystem.updateObjectPosition(id, oldPos, newPos);
  }

  public getQualitySettings(): QualitySettings {
    return this.qualityManager.getQualitySettings();
  }

  private applyQualitySettings(settings: QualitySettings) {
    const event = new CustomEvent('game-quality-changed', { 
      detail: settings 
    });
    document.dispatchEvent(event);
  }
}

export const gameSystems = GameSystems.getInstance(); 