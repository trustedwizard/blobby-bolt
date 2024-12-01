export const PowerUpType = {
  SPEED_BOOST: 'SPEED_BOOST',
  SHIELD: 'SHIELD',
  BLOB_MAGNET: 'BLOB_MAGNET',
  GRAVITY_PULSE: 'GRAVITY_PULSE',
  TELEPORT: 'TELEPORT',
  SPLIT_BOMB: 'SPLIT_BOMB'
};

export const POWER_UP_COMBOS = {
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