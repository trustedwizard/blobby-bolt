import { Position } from './common';

export enum PowerUpType {
  SPEED_BOOST = 'SPEED_BOOST',
  SHIELD = 'SHIELD',
  BLOB_MAGNET = 'BLOB_MAGNET',
  GRAVITY_PULSE = 'GRAVITY_PULSE',
  TELEPORT = 'TELEPORT',
  SPLIT_BOMB = 'SPLIT_BOMB'
}

export interface PowerUp {
  id: string;
  type: PowerUpType;
  position: Position;
  color: number;
  duration: number;
  expiresAt: number;
  spawnTime: number;
  isInstant: boolean;
}

export interface ActivePowerUp extends PowerUp {
  playerId: string;
}

export interface PowerUpCombo {
  id: string;
  types: PowerUpType[];
  startTime: number;
  duration: number;
  playerId: string;
}

export interface PowerUpComboEntry {
  types: PowerUpType[];
  name: string;
  description: string;
  bonusEffect: string;
}

export const POWER_UP_COMBOS: Record<string, PowerUpComboEntry> = {
  SPEED_SHIELD: {
    types: [PowerUpType.SPEED_BOOST, PowerUpType.SHIELD],
    name: 'Charging Shield',
    description: 'Move faster while being protected',
    bonusEffect: 'Damages nearby enemies on contact'
  },
  MAGNET_GRAVITY: {
    types: [PowerUpType.BLOB_MAGNET, PowerUpType.GRAVITY_PULSE],
    name: 'Black Hole',
    description: 'Creates a powerful attraction field',
    bonusEffect: 'Increased pull force and range'
  },
  TELEPORT_SPLIT: {
    types: [PowerUpType.TELEPORT, PowerUpType.SPLIT_BOMB],
    name: 'Quantum Blast',
    description: 'Teleport and create a splitting wave',
    bonusEffect: 'Splits all blobs in the destination area'
  }
}; 