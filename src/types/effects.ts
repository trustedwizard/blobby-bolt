import { Position, Velocity } from './common';
import { PowerUpType, POWER_UP_TYPES } from './powerups';

export interface VisualEffect {
  id: string;
  type: EffectType;
  position: Position;
  color: number;
  startTime: number;
  duration: number;
  scale: number;
  opacity: number;
  velocity?: Velocity;
  rotation?: number;
  blendMode?: BlendMode;
}

export type EffectType = 
  | 'powerup_collect'
  | 'powerup_expire'
  | 'collision'
  | 'split'
  | 'merge'
  | 'death'
  | 'spawn'
  | 'growth'
  | 'shrink'
  | 'bounce'
  | 'teleport'
  | 'shield'
  | 'ghost'
  | 'combo';

export type BlendMode = 
  | 'normal'
  | 'add'
  | 'multiply'
  | 'screen'
  | 'overlay';

export interface ParticleEffect extends VisualEffect {
  particleCount: number;
  particleSize: number;
  particleSpeed: number;
  particleLifetime: number;
  spread: number;
  gravity?: number;
  fadeOut?: boolean;
}

export interface PowerUpVisualEffect extends VisualEffect {
  powerUpType: PowerUpType;
  particles?: ParticleEffect;
  trail?: TrailEffect;
  aura?: AuraEffect;
}

export interface CollisionEffect extends VisualEffect {
  force: number;
  radius: number;
  shockwave?: boolean;
  debris?: boolean;
}

export interface TrailEffect extends VisualEffect {
  width: number;
  fade: boolean;
  segments: number;
  spacing: number;
}

export interface AuraEffect extends VisualEffect {
  innerRadius: number;
  outerRadius: number;
  pulse: boolean;
  frequency: number;
}

export interface ComboEffect extends VisualEffect {
  comboName: string;
  powerUps: PowerUpType[];
  specialEffect?: SpecialEffect;
}

export interface SpecialEffect {
  type: SpecialEffectType;
  params: Record<string, any>;
}

export type SpecialEffectType = 
  | 'lightning'
  | 'explosion'
  | 'vortex'
  | 'rainbow'
  | 'pixelate'
  | 'glitch'
  | 'wave';

export interface EffectManager {
  activeEffects: Map<string, VisualEffect>;
  particleSystems: Map<string, ParticleEffect>;
  
  addEffect(effect: VisualEffect): void;
  removeEffect(effectId: string): void;
  updateEffects(deltaTime: number): void;
  clearEffects(): void;
}

export interface EffectConfig {
  maxParticles: number;
  maxEffects: number;
  defaultDuration: number;
  particleSize: number;
  particleSpeed: number;
  trailLength: number;
  auraSize: number;
  blendModes: {
    [key in EffectType]: BlendMode;
  };
  colors: {
    [key in EffectType]: number;
  };
}

// Default effect configurations
export const DEFAULT_EFFECT_CONFIG: EffectConfig = {
  maxParticles: 1000,
  maxEffects: 100,
  defaultDuration: 1000,
  particleSize: 4,
  particleSpeed: 2,
  trailLength: 10,
  auraSize: 50,
  blendModes: {
    powerup_collect: 'add',
    powerup_expire: 'screen',
    collision: 'normal',
    split: 'normal',
    merge: 'add',
    death: 'screen',
    spawn: 'add',
    growth: 'normal',
    shrink: 'normal',
    bounce: 'normal',
    teleport: 'screen',
    shield: 'screen',
    ghost: 'screen',
    combo: 'add'
  },
  colors: {
    powerup_collect: 0xFFFFFF,
    powerup_expire: 0xCCCCCC,
    collision: 0xFF0000,
    split: 0x00FF00,
    merge: 0x0000FF,
    death: 0xFF0000,
    spawn: 0x00FF00,
    growth: 0xFFFF00,
    shrink: 0xFF00FF,
    bounce: 0x00FFFF,
    teleport: 0x9400D3,
    shield: 0x00FFFF,
    ghost: 0x808080,
    combo: 0xFFA500
  }
}; 