import { Application, Container, Graphics } from 'pixi.js';
import { Position } from '../types/common';
import { EffectConfig } from '../types/effects';
import { ObjectPool } from '../utils/objectPool';
import { BaseSystem } from './BaseSystem';

interface ParticleEffect {
  id: string;
  type: 'grow' | 'powerup' | 'collision';
  position: Position;
  color: number;
  duration: number;
  startTime: number;
  particles: Graphics[];
}

export class VisualEffectsSystem extends BaseSystem {
  protected static override instance: VisualEffectsSystem;
  private app: Application | null = null;
  private container: Container | null = null;
  private config: EffectConfig | null = null;
  private effects: Map<string, ParticleEffect> = new Map();
  private particlePool: ObjectPool<Graphics>;

  private constructor() {
    super();
    this.particlePool = new ObjectPool<Graphics>(
      () => {
        const graphics = new Graphics();
        graphics.beginFill(0xFFFFFF);
        graphics.drawCircle(0, 0, 4);
        graphics.endFill();
        return graphics;
      },
      (particle) => particle.destroy(),
      50,
      200
    );
  }

  public static override getInstance(): VisualEffectsSystem {
    if (!VisualEffectsSystem.instance) {
      VisualEffectsSystem.instance = new VisualEffectsSystem();
    }
    return VisualEffectsSystem.instance;
  }

  init(app: Application, config: EffectConfig): void {
    this.app = app;
    this.config = config;
    this.container = new Container();
    app.stage.addChild(this.container);
  }

  createPowerUpEffect(position: Position, color: number): void {
    if (!this.app || !this.container || !this.config) return;

    const particles = Array.from({ length: 12 }, () => {
      const particle = this.particlePool.acquire();
      particle.clear()
        .beginFill(color, 0.8)
        .drawCircle(0, 0, 4)
        .endFill();
      return particle;
    });

    const effect: ParticleEffect = {
      id: `powerup-${Date.now()}`,
      type: 'powerup',
      position,
      color,
      duration: this.config.defaultDuration,
      startTime: Date.now(),
      particles
    };

    particles.forEach((particle, i) => {
      const angle = (i / particles.length) * Math.PI * 2;
      const distance = 30;
      particle.position.set(
        position.x + Math.cos(angle) * distance,
        position.y + Math.sin(angle) * distance
      );
      this.container!.addChild(particle);
    });

    this.effects.set(effect.id, effect);
  }

  createCollisionEffect(position: Position, color: number): void {
    if (!this.app || !this.container || !this.config) return;

    const particles = Array.from({ length: 16 }, () => {
      const particle = this.particlePool.acquire();
      particle.clear()
        .beginFill(color, 0.7)
        .drawCircle(0, 0, 3)
        .endFill();
      return particle;
    });

    const effect: ParticleEffect = {
      id: `collision-${Date.now()}`,
      type: 'collision',
      position,
      color,
      duration: 300,
      startTime: Date.now(),
      particles
    };

    particles.forEach((particle, i) => {
      const angle = (i / particles.length) * Math.PI * 2;
      const distance = 20 + Math.random() * 20;
      particle.position.set(
        position.x + Math.cos(angle) * distance,
        position.y + Math.sin(angle) * distance
      );
      this.container!.addChild(particle);
    });

    this.effects.set(effect.id, effect);
  }

  createGrowthEffect(position: Position, color: number): void {
    if (!this.app || !this.container || !this.config) return;

    const particles = Array.from({ length: 8 }, () => {
      const particle = this.particlePool.acquire();
      particle.clear()
        .beginFill(color, 0.6)
        .drawCircle(0, 0, 4)
        .endFill();
      return particle;
    });

    const effect: ParticleEffect = {
      id: `growth-${Date.now()}`,
      type: 'grow',
      position,
      color,
      duration: 500,
      startTime: Date.now(),
      particles
    };

    particles.forEach((particle, i) => {
      const angle = (i / particles.length) * Math.PI * 2;
      const distance = 20;
      particle.position.set(
        position.x + Math.cos(angle) * distance,
        position.y + Math.sin(angle) * distance
      );
      this.container!.addChild(particle);
    });

    this.effects.set(effect.id, effect);
  }

  update(): void {
    const now = Date.now();

    for (const [id, effect] of this.effects.entries()) {
      const elapsed = now - effect.startTime;
      const progress = Math.min(1, elapsed / effect.duration);

      if (progress >= 1) {
        // Clean up effect
        effect.particles.forEach(particle => {
          this.container?.removeChild(particle);
          this.particlePool.release(particle);
        });
        this.effects.delete(id);
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

  protected override cleanupResources(): void {
    this.effects.forEach(effect => {
      effect.particles.forEach(particle => {
        particle.destroy();
      });
    });
    this.effects.clear();
    this.particlePool.clear();
    this.container?.destroy();
    this.container = null;
    this.app = null;
    this.config = null;
  }
} 