import { config } from './utils/config.js';
import { logger } from './utils/logger.js';

const POWER_UP_TYPES = {
  SPEED: {
    name: 'Speed Boost',
    duration: 5000,
    multiplier: 1.5,
    color: 0xFFFF00,
    radius: 20,
    weight: 30,
    stackable: false,
    effect: (player) => {
      player.speed *= 1.5;
      return () => { player.speed /= 1.5; };
    }
  },
  SHIELD: {
    name: 'Shield',
    duration: 8000,
    color: 0x00FFFF,
    radius: 25,
    weight: 20,
    stackable: true,
    maxStacks: 3,
    effect: (player) => {
      player.shield = true;
      return () => { player.shield = false; };
    }
  },
  SIZE: {
    name: 'Size Change',
    duration: 6000,
    color: 0xFF00FF,
    radius: 22,
    weight: 15,
    stackable: false,
    effect: (player) => {
      const originalSize = player.radius;
      player.radius *= 1.3;
      return () => { player.radius = originalSize; };
    }
  },
  POINTS: {
    name: 'Point Multiplier',
    duration: 10000,
    multiplier: 2,
    color: 0xFFA500,
    radius: 18,
    weight: 25,
    stackable: false,
    effect: (player) => {
      player.pointMultiplier = (player.pointMultiplier || 1) * 2;
      return () => { player.pointMultiplier /= 2; };
    }
  },
  GHOST: {
    name: 'Ghost Mode',
    duration: 4000,
    color: 0x808080,
    radius: 23,
    weight: 10,
    stackable: false,
    effect: (player) => {
      player.ghost = true;
      return () => { player.ghost = false; };
    }
  }
};

export class PowerUpSystem {
  constructor(worldSize = config.worldSize) {
    this.worldSize = Math.max(1000, Math.min(10000, Number(worldSize) || 4000));
    this.powerUps = new Map();
    this.activeEffects = new Map();
    this.cellSize = 100;
    this.gridSize = Math.max(1, Math.min(100, Math.ceil(this.worldSize / this.cellSize)));
    this.grid = this.initializeGrid();
    this.spawnInterval = config.powerUpSpawnInterval || 5000;
    this.maxPowerUps = config.maxPowerUps || 20;
    this.minDistance = 100;
    this.lastSpawnTime = Date.now();
    this.powerUpTypes = POWER_UP_TYPES;
    
    logger.info('PowerUpSystem initialized', {
      worldSize: this.worldSize,
      cellSize: this.cellSize,
      gridSize: this.gridSize,
      spawnInterval: this.spawnInterval,
      maxPowerUps: this.maxPowerUps
    });
  }

  getActivePowerUps() {
    return Array.from(this.powerUps.values());
  }

  clear() {
    this.powerUps.clear();
    this.activeEffects.clear();
    this.grid = this.initializeGrid();
    this.lastSpawnTime = Date.now();
  }

  update() {
    const now = Date.now();

    // Update active effects
    for (const [playerId, effects] of this.activeEffects) {
      effects.forEach((effect, index) => {
        if (now >= effect.endTime) {
          effect.cleanup();
          effects.splice(index, 1);
          logger.debug('Power-up effect expired', {
            playerId,
            powerUpType: effect.type
          });
        }
      });

      if (effects.length === 0) {
        this.activeEffects.delete(playerId);
      }
    }

    // Spawn new power-ups
    if (now - this.lastSpawnTime >= this.spawnInterval) {
      this.spawnRandomPowerUp();
      this.lastSpawnTime = now;
    }
  }

  spawnRandomPowerUp() {
    if (this.powerUps.size >= this.maxPowerUps) {
      logger.debug('Maximum power-ups reached, skipping spawn');
      return null;
    }

    const type = this.getRandomPowerUpType();
    const position = this.findSpawnPosition();
    
    if (!position) {
      logger.warn('Could not find suitable spawn position for power-up');
      return null;
    }

    return this.createPowerUp(type, position.x, position.y);
  }

  createPowerUp(type, x, y) {
    const powerUpType = this.powerUpTypes[type];
    if (!powerUpType) {
      logger.error('Invalid power-up type', { type });
      throw new Error(`Invalid power-up type: ${type}`);
    }

    const id = `powerup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const powerUp = {
      id,
      type,
      x,
      y,
      ...powerUpType,
      createdAt: Date.now()
    };

    this.powerUps.set(id, powerUp);
    this.addToGrid(powerUp);

    logger.debug('Power-up created', {
      id,
      type,
      position: { x, y }
    });

    return powerUp;
  }

  findSpawnPosition() {
    const maxAttempts = 20;
    
    for (let i = 0; i < maxAttempts; i++) {
      const x = Math.random() * this.worldSize;
      const y = Math.random() * this.worldSize;
      
      if (!this.isLocationOccupied(x, y)) {
        return { x, y };
      }
    }
    
    return null;
  }

  isLocationOccupied(x, y) {
    const nearbyPowerUps = this.getNearbyPowerUps(x, y, this.minDistance);
    return nearbyPowerUps.length > 0;
  }

  addToGrid(powerUp) {
    const cell = this.getGridCell(powerUp.x, powerUp.y);
    if (this.grid[cell.x]?.[cell.y]) {
      this.grid[cell.x][cell.y].add(powerUp.id);
    }
  }

  removeFromGrid(powerUp) {
    const cell = this.getGridCell(powerUp.x, powerUp.y);
    if (this.grid[cell.x]?.[cell.y]) {
      this.grid[cell.x][cell.y].delete(powerUp.id);
    }
  }

  getGridCell(x, y) {
    return {
      x: Math.floor(x / this.cellSize),
      y: Math.floor(y / this.cellSize)
    };
  }

  getNearbyPowerUps(x, y, radius) {
    const cell = this.getGridCell(x, y);
    const cellRadius = Math.ceil(radius / this.cellSize);
    const nearbyPowerUps = [];

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const checkX = cell.x + dx;
        const checkY = cell.y + dy;
        
        if (checkX >= 0 && checkX < this.grid.length && 
            checkY >= 0 && checkY < this.grid[0].length) {
          this.grid[checkX][checkY].forEach(powerUpId => {
            const powerUp = this.powerUps.get(powerUpId);
            if (powerUp) {
              const distance = Math.hypot(x - powerUp.x, y - powerUp.y);
              if (distance <= radius) {
                nearbyPowerUps.push(powerUp);
              }
            }
          });
        }
      }
    }

    return nearbyPowerUps;
  }

  handleCollision(player, powerUpId) {
    const powerUp = this.powerUps.get(powerUpId);
    if (!powerUp) return false;

    try {
      // Check if player can stack this power-up
      if (!this.canApplyPowerUp(player, powerUp)) {
        logger.debug('Power-up stack limit reached', {
          playerId: player.id,
          powerUpType: powerUp.type
        });
        return false;
      }

      // Apply power-up effect
      const cleanup = powerUp.effect(player);
      const effect = {
        type: powerUp.type,
        endTime: Date.now() + powerUp.duration,
        cleanup
      };

      // Track active effect
      if (!this.activeEffects.has(player.id)) {
        this.activeEffects.set(player.id, []);
      }
      this.activeEffects.get(player.id).push(effect);

      // Remove power-up from world
      this.removePowerUp(powerUpId);

      logger.debug('Power-up collected', {
        playerId: player.id,
        powerUpId,
        powerUpType: powerUp.type
      });

      return true;
    } catch (error) {
      logger.error('Error applying power-up effect', {
        playerId: player.id,
        powerUpId,
        error: error.message
      });
      return false;
    }
  }

  canApplyPowerUp(player, powerUp) {
    if (!powerUp.stackable) {
      // Check if player already has this non-stackable effect
      const activeEffects = this.activeEffects.get(player.id) || [];
      return !activeEffects.some(effect => effect.type === powerUp.type);
    }

    // Check stack limit for stackable effects
    const currentStacks = (this.activeEffects.get(player.id) || [])
      .filter(effect => effect.type === powerUp.type)
      .length;

    return currentStacks < (powerUp.maxStacks || Infinity);
  }

  removePowerUp(powerUpId) {
    const powerUp = this.powerUps.get(powerUpId);
    if (!powerUp) return false;

    this.removeFromGrid(powerUp);
    this.powerUps.delete(powerUpId);

    logger.debug('Power-up removed', {
      powerUpId,
      type: powerUp.type,
      position: { x: powerUp.x, y: powerUp.y }
    });

    return true;
  }

  getRandomPowerUpType() {
    const types = Object.keys(this.powerUpTypes);
    const weights = types.map(type => this.powerUpTypes[type].weight);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < types.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return types[i];
      }
    }
    
    return types[0];
  }

  initializeGrid() {
    try {
      return Array(this.gridSize).fill(null).map(() => 
        Array(this.gridSize).fill(null).map(() => new Set())
      );
    } catch (error) {
      logger.error('Failed to initialize power-up grid', {
        gridSize: this.gridSize,
        worldSize: this.worldSize,
        cellSize: this.cellSize,
        error: error.message
      });
      this.gridSize = 50;
      return Array(this.gridSize).fill(null).map(() => 
        Array(this.gridSize).fill(null).map(() => new Set())
      );
    }
  }

  getPowerUps() {
    return Array.from(this.powerUps.values());
  }

  getActiveEffects(playerId) {
    return this.activeEffects.get(playerId) || [];
  }

  removePlayerEffects(playerId) {
    const effects = this.activeEffects.get(playerId);
    if (effects) {
      effects.forEach(effect => effect.cleanup());
      this.activeEffects.delete(playerId);
      
      logger.debug('Player effects removed', {
        playerId,
        effectCount: effects.length
      });
    }
  }
} 