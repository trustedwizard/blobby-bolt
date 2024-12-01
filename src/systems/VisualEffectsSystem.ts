import * as PIXI from 'pixi.js';
import { Position } from '../types/common';
import { ObjectPool } from '../utils/objectPool';
import { BaseSystem } from './BaseSystem';

interface ParticleEffect {
  id: string;
  type: 'grow' | 'powerup' | 'collision';
  position: Position;
  color: number;
  duration: number;
  startTime: number;
  particles: PIXI.Graphics[];
}

export interface IVisualEffectsSystem extends BaseSystem {
  createPowerUpEffect(position: Position, color: number): void;
  createCollisionEffect(position: Position, color: number): void;
  createGrowthEffect(position: Position, color: number): void;
  update(): void;
  dispose(): void;
}

export class VisualEffectsSystem extends BaseSystem implements IVisualEffectsSystem {
  private particlePool: ObjectPool<PIXI.Graphics>;
  private activeEffects: Map<string, ParticleEffect>;
  private container: PIXI.Container;

  private constructor(container: PIXI.Container) {
    super();
    this.container = container;
    this.activeEffects = new Map();
    this.particlePool = new ObjectPool<PIXI.Graphics>(
      () => {
        const graphics = new PIXI.Graphics();
        graphics.beginFill(0xFFFFFF);
        graphics.drawPolygon([0, -4, 4, 4, -4, 4]);
        graphics.endFill();
        return graphics;
      },
      (particle) => particle.destroy(),
      50,
      200
    );
  }

  public static getInstance(container: PIXI.Container): VisualEffectsSystem {
    if (!VisualEffectsSystem.instance) {
      VisualEffectsSystem.instance = new VisualEffectsSystem(container);
    }
    return VisualEffectsSystem.instance;
  }

  public createGrowthEffect(position: Position, color: number): void {
    const effect: ParticleEffect = {
      id: `growth-${Date.now()}`,
      type: 'grow' as const,
      position,
      color,
      duration: 500,
      startTime: Date.now(),
      particles: []
    };

    const particles = Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * Math.PI * 2;
      const particle = this.particlePool.acquire();
      
      particle.clear()
        .beginFill(color, 0.6)
        .drawCircle(0, 0, 4)
        .endFill();

      particle.position.set(
        position.x + Math.cos(angle) * 20,
        position.y + Math.sin(angle) * 20
      );

      particle.alpha = 1;
      this.container.addChild(particle);

      return particle;
    });

    effect.particles = particles;
    this.activeEffects.set(effect.id, effect);
  }

  public createPowerUpEffect(position: Position, color: number): void {
    const effect = {
      id: `powerup-${Date.now()}`,
      type: 'powerup' as const,
      position,
      color,
      duration: 1000,
      startTime: Date.now(),
      particles: []
    };

    const particles = Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2;
      const particle = this.particlePool.acquire();
      
      particle.clear()
        .beginFill(color, 0.8);
      
      const outerRadius = 8;
      const innerRadius = 4;
      for (let i = 0; i < 5; i++) {
        const startAngle = (i * 4 * Math.PI) / 5;
        const endAngle = ((i * 4 + 2) * Math.PI) / 5;
        
        if (i === 0) {
          particle.moveTo(
            Math.cos(startAngle) * outerRadius,
            Math.sin(startAngle) * outerRadius
          );
        }
        
        particle.lineTo(
          Math.cos(startAngle) * outerRadius,
          Math.sin(startAngle) * outerRadius
        );
        particle.lineTo(
          Math.cos(endAngle) * innerRadius,
          Math.sin(endAngle) * innerRadius
        );
      }
      
      particle.closePath()
        .endFill();

      particle.position.set(
        position.x + Math.cos(angle) * 30,
        position.y + Math.sin(angle) * 30
      );

      particle.alpha = 1;
      this.container.addChild(particle);

      return particle;
    });

    this.activeEffects.set(effect.id, { ...effect, particles });
  }

  public createCollisionEffect(position: Position, color: number): void {
    const effect = {
      id: `collision-${Date.now()}`,
      type: 'collision' as const,
      position,
      color,
      duration: 300,
      startTime: Date.now(),
      particles: []
    };

    const particles = Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * Math.PI * 2;
      const particle = this.particlePool.acquire();
      
      particle.clear()
        .beginFill(color, 0.7)
        .drawCircle(0, 0, 3)
        .endFill();

      const distance = 20 + Math.random() * 20;
      particle.position.set(
        position.x + Math.cos(angle) * distance,
        position.y + Math.sin(angle) * distance
      );

      particle.alpha = 1;
      this.container.addChild(particle);

      return particle;
    });

    this.activeEffects.set(effect.id, { ...effect, particles });
  }

  public update(): void {
    const now = Date.now();

    for (const [id, effect] of this.activeEffects.entries()) {
      const elapsed = now - effect.startTime;
      const progress = Math.min(1, elapsed / effect.duration);

      if (progress >= 1) {
        // Clean up effect
        effect.particles.forEach(particle => {
          this.container.removeChild(particle);
          this.particlePool.release(particle);
        });
        this.activeEffects.delete(id);
        continue;
      }

      // Update particles based on effect type
      switch (effect.type) {
        case 'grow':
          this.updateGrowthEffect(effect, progress);
          break;
        case 'powerup':
          this.updatePowerUpEffect(effect, progress);
          break;
        case 'collision':
          this.updateCollisionEffect(effect, progress);
          break;
      }
    }
  }

  private updateGrowthEffect(effect: ParticleEffect, progress: number): void {
    effect.particles.forEach((particle, i) => {
      const angle = (i / effect.particles.length) * Math.PI * 2;
      const scale = 1 + Math.sin(progress * Math.PI) * 0.5;
      const distance = 20 * scale;

      particle.position.set(
        effect.position.x + Math.cos(angle) * distance,
        effect.position.y + Math.sin(angle) * distance
      );
      particle.alpha = 1 - progress;
    });
  }

  private updatePowerUpEffect(effect: ParticleEffect, progress: number): void {
    effect.particles.forEach((particle, i) => {
      const angle = (i / effect.particles.length) * Math.PI * 2;
      const distance = 30 + Math.sin(progress * Math.PI * 2) * 10;

      particle.position.set(
        effect.position.x + Math.cos(angle) * distance,
        effect.position.y + Math.sin(angle) * distance
      );
      particle.rotation = progress * Math.PI * 2;
      particle.alpha = 1 - progress;
    });
  }

  private updateCollisionEffect(effect: ParticleEffect, progress: number): void {
    effect.particles.forEach(particle => {
      const dx = particle.position.x - effect.position.x;
      const dy = particle.position.y - effect.position.y;
      const distance = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      const newDistance = distance * (1 + progress);
      particle.position.set(
        effect.position.x + Math.cos(angle) * newDistance,
        effect.position.y + Math.sin(angle) * newDistance
      );
      particle.alpha = 1 - progress;
    });
  }

  protected cleanupResources(): void {
    for (const [id, effect] of this.activeEffects.entries()) {
      effect.particles.forEach(particle => {
        this.container.removeChild(particle);
        this.particlePool.release(particle);
      });
      this.activeEffects.delete(id);
    }
    this.particlePool.clear();
  }
} 