import { EntityBase, EntityType } from './common';

// Define power-up type constants
export const PowerUpType = {
  SPEED: 'SPEED',
  SHIELD: 'SHIELD',
  MASS: 'MASS',
  GHOST: 'GHOST',
  SPLIT: 'SPLIT'
} as const;

export type PowerUpType = typeof PowerUpType[keyof typeof PowerUpType];

// For backwards compatibility
export const POWER_UP_TYPES = PowerUpType;

export interface PowerUpProperties {
  name: string;
  description: string;
  duration: number;
  color: number;
  radius: number;
  spawnWeight: number;
  stackable: boolean;
  maxStacks?: number;
  icon: string;
  effect: PowerUpEffect;
}

export interface PowerUpBase extends EntityBase {
  entityType: 'powerup';
  powerUpType: PowerUpType;
  properties: PowerUpProperties;
}

export interface PowerUpEffect {
  type: PowerUpType;
  multiplier?: number;
  damageReduction?: number;
  passThrough?: boolean;
  splitCooldown?: number;
}

export interface PowerUpState {
  activeEffects: Map<string, PowerUpEffect[]>;
  recentlyCollected: Set<string>;
}

export interface PowerUpConfig {
  spawnInterval: number;
  maxPowerUps: number;
  minDistance: number;
  collectionRadius: number;
  effectDurations: Record<PowerUpType, number>;
  stackLimits: Record<PowerUpType, number>;
  spawnWeights: Record<PowerUpType, number>;
}

export interface PowerUpEvent {
  type: 'collect' | 'expire' | 'activate';
  powerUpId: string;
  playerId: string;
  powerUpType: PowerUpType;
  timestamp: number;
}

export interface PowerUpCombo {
  types: PowerUpType[];
  name: string;
  description: string;
  bonusEffect: {
    type: string;
    value?: number;
    radius?: number;
    duration?: number;
    multiplier?: number;
  };
  icon: string;
}

export const POWER_UP_PROPERTIES: Record<PowerUpType, PowerUpProperties> = {
  [PowerUpType.SPEED]: {
    name: 'Speed Boost',
    description: 'Increases movement speed by 50%',
    duration: 10000,
    color: 0xFFFF00,
    radius: 20,
    spawnWeight: 30,
    stackable: false,
    icon: '⚡',
    effect: {
      type: PowerUpType.SPEED,
      multiplier: 1.5
    }
  },
  [PowerUpType.SHIELD]: {
    name: 'Shield',
    description: 'Reduces incoming damage by 50%',
    duration: 15000,
    color: 0x00FFFF,
    radius: 20,
    spawnWeight: 20,
    stackable: false,
    icon: '🛡️',
    effect: {
      type: PowerUpType.SHIELD,
      damageReduction: 0.5
    }
  },
  [PowerUpType.MASS]: {
    name: 'Mass Boost',
    description: 'Increases blob size by 25%',
    duration: 8000,
    color: 0xFF00FF,
    radius: 20,
    spawnWeight: 25,
    stackable: true,
    maxStacks: 3,
    icon: '⭐',
    effect: {
      type: PowerUpType.MASS,
      multiplier: 1.25
    }
  },
  [PowerUpType.GHOST]: {
    name: 'Ghost Mode',
    description: 'Pass through other blobs',
    duration: 5000,
    color: 0x808080,
    radius: 20,
    spawnWeight: 15,
    stackable: false,
    icon: '👻',
    effect: {
      type: PowerUpType.GHOST,
      passThrough: true
    }
  },
  [PowerUpType.SPLIT]: {
    name: 'Split Master',
    description: 'Reduces split cooldown by 50%',
    duration: 12000,
    color: 0xFFA500,
    radius: 20,
    spawnWeight: 20,
    stackable: false,
    icon: '✂️',
    effect: {
      type: PowerUpType.SPLIT,
      splitCooldown: 0.5
    }
  }
};

export const POWER_UP_COMBOS: Record<string, PowerUpCombo> = {
  SPEED_SHIELD: {
    types: [PowerUpType.SPEED, PowerUpType.SHIELD],
    name: 'Juggernaut',
    description: 'Move faster while being protected',
    bonusEffect: {
      type: 'damage',
      value: 10,
      radius: 50
    },
    icon: '🔰'
  },
  GHOST_MASS: {
    types: [PowerUpType.GHOST, PowerUpType.MASS],
    name: 'Phantom Giant',
    description: 'Phase through blobs with increased size',
    bonusEffect: {
      type: 'fear',
      radius: 100,
      duration: 2000
    },
    icon: '👻⭐'
  },
  SPEED_SPLIT: {
    types: [PowerUpType.SPEED, PowerUpType.SPLIT],
    name: 'Swift Divider',
    description: 'Rapid movement and splitting',
    bonusEffect: {
      type: 'splitSpeed',
      multiplier: 1.5
    },
    icon: '⚡✂️'
  }
};

// Default configurations
export const DEFAULT_POWER_UP_CONFIG: PowerUpConfig = {
  spawnInterval: 5000,
  maxPowerUps: 20,
  minDistance: 100,
  collectionRadius: 50,
  effectDurations: {
    [PowerUpType.SPEED]: 10000,
    [PowerUpType.SHIELD]: 15000,
    [PowerUpType.MASS]: 8000,
    [PowerUpType.GHOST]: 5000,
    [PowerUpType.SPLIT]: 12000
  },
  stackLimits: {
    [PowerUpType.SPEED]: 1,
    [PowerUpType.SHIELD]: 1,
    [PowerUpType.MASS]: 3,
    [PowerUpType.GHOST]: 1,
    [PowerUpType.SPLIT]: 1
  },
  spawnWeights: {
    [PowerUpType.SPEED]: 30,
    [PowerUpType.SHIELD]: 20,
    [PowerUpType.MASS]: 25,
    [PowerUpType.GHOST]: 15,
    [PowerUpType.SPLIT]: 20
  }
}; 