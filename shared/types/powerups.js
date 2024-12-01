export const PowerUpType = {
  SPEED: 'SPEED',
  SHIELD: 'SHIELD',
  MASS_BOOST: 'MASS_BOOST',
  GHOST: 'GHOST',
  SPLIT_COOLDOWN: 'SPLIT_COOLDOWN'
};

export const POWER_UP_PROPERTIES = {
  [PowerUpType.SPEED]: {
    name: 'Speed Boost',
    description: 'Increases movement speed by 50%',
    duration: 10000,
    effect: {
      type: 'speed',
      multiplier: 1.5
    },
    color: 0xFFFF00,
    spawnWeight: 30,
    stackable: false,
    icon: '⚡'
  },
  [PowerUpType.SHIELD]: {
    name: 'Shield',
    description: 'Reduces incoming damage by 50%',
    duration: 15000,
    effect: {
      type: 'shield',
      damageReduction: 0.5
    },
    color: 0x00FFFF,
    spawnWeight: 20,
    stackable: false,
    icon: '🛡️'
  },
  [PowerUpType.MASS_BOOST]: {
    name: 'Mass Boost',
    description: 'Increases blob size by 25%',
    duration: 8000,
    effect: {
      type: 'mass',
      multiplier: 1.25
    },
    color: 0xFF00FF,
    spawnWeight: 25,
    stackable: true,
    icon: '⭐'
  },
  [PowerUpType.GHOST]: {
    name: 'Ghost Mode',
    description: 'Pass through other blobs',
    duration: 5000,
    effect: {
      type: 'ghost',
      passThrough: true
    },
    color: 0x808080,
    spawnWeight: 15,
    stackable: false,
    icon: '👻'
  },
  [PowerUpType.SPLIT_COOLDOWN]: {
    name: 'Split Master',
    description: 'Reduces split cooldown by 50%',
    duration: 12000,
    effect: {
      type: 'splitCooldown',
      multiplier: 0.5
    },
    color: 0xFFA500,
    spawnWeight: 20,
    stackable: false,
    icon: '✂️'
  }
};

export const POWER_UP_COMBOS = {
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
    types: [PowerUpType.GHOST, PowerUpType.MASS_BOOST],
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
    types: [PowerUpType.SPEED, PowerUpType.SPLIT_COOLDOWN],
    name: 'Swift Divider',
    description: 'Rapid movement and splitting',
    bonusEffect: {
      type: 'splitSpeed',
      multiplier: 1.5
    },
    icon: '⚡✂️'
  }
};

export const EffectType = {
  SPEED: 'speed',
  SHIELD: 'shield',
  MASS: 'mass',
  GHOST: 'ghost',
  SPLIT_COOLDOWN: 'splitCooldown',
  DAMAGE: 'damage',
  FEAR: 'fear',
  SPLIT_SPEED: 'splitSpeed'
};

export const isPowerUpComboActive = (activeEffects, combo) => {
  return combo.types.every(type => 
    activeEffects.some(effect => effect.type === POWER_UP_PROPERTIES[type].effect.type)
  );
};

export const getPowerUpById = (id) => {
  const [type] = id.split('-');
  return POWER_UP_PROPERTIES[type] || null;
};

export const getComboEffects = (activeEffects) => {
  return Object.values(POWER_UP_COMBOS)
    .filter(combo => isPowerUpComboActive(activeEffects, combo))
    .map(combo => ({
      name: combo.name,
      effect: combo.bonusEffect
    }));
}; 