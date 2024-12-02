import { config } from './utils/config.js';
import { logger } from './utils/logger.js';

// Obstacle types and their properties
const OBSTACLE_TYPES = {
  WALL: {
    name: 'Wall',
    solid: true,
    destructible: false,
    damage: 0,
    bounceForce: 1,
    color: 0x808080,
    defaultWidth: 100,
    defaultHeight: 20
  },
  SPIKE: {
    name: 'Spike',
    solid: true,
    destructible: false,
    damage: 25,
    bounceForce: 0.5,
    color: 0xFF0000,
    defaultWidth: 30,
    defaultHeight: 30
  },
  BREAKABLE: {
    name: 'Breakable',
    solid: true,
    destructible: true,
    health: 100,
    damage: 0,
    bounceForce: 0.8,
    color: 0xA0522D,
    defaultWidth: 50,
    defaultHeight: 50
  },
  SLIME: {
    name: 'Slime',
    solid: false,
    destructible: false,
    damage: 0,
    speedMultiplier: 0.5,
    color: 0x00FF00,
    defaultWidth: 80,
    defaultHeight: 80
  },
  TELEPORTER: {
    name: 'Teleporter',
    solid: false,
    destructible: false,
    damage: 0,
    cooldown: 5000, // 5 seconds
    color: 0x9400D3,
    defaultWidth: 40,
    defaultHeight: 40
  }
};

export class ObstacleSystem {
  constructor(worldSize = config.worldSize) {
    // Validate and sanitize worldSize
    this.worldSize = Math.max(1000, Math.min(10000, Number(worldSize) || 4000));
    this.obstacles = new Map();
    this.cellSize = 100;
    this.gridSize = Math.max(1, Math.min(100, Math.ceil(this.worldSize / this.cellSize)));
    this.grid = this.initializeGrid();
    this.lastUpdateTime = Date.now();
    this.updateInterval = 100;
    this.obstacleTypes = OBSTACLE_TYPES;
    this.teleporterCooldowns = new Map();
    this.maxObstacles = 100;
    this.minObstacleDistance = 50;

    logger.info('ObstacleSystem initialized', {
      worldSize: this.worldSize,
      cellSize: this.cellSize,
      gridSize: this.gridSize,
      updateInterval: this.updateInterval,
      maxObstacles: this.maxObstacles,
      obstacleTypes: Object.keys(this.obstacleTypes)
    });
  }

  initializeGrid() {
    try {
      return Array(this.gridSize).fill(null).map(() => 
        Array(this.gridSize).fill(null).map(() => new Set())
      );
    } catch (error) {
      logger.error('Failed to initialize obstacle grid', {
        gridSize: this.gridSize,
        worldSize: this.worldSize,
        cellSize: this.cellSize,
        error: error.message
      });
      // Fallback to a smaller grid if initialization fails
      this.gridSize = 50;
      return Array(this.gridSize).fill(null).map(() => 
        Array(this.gridSize).fill(null).map(() => new Set())
      );
    }
  }

  removeObstacle(id) {
    const obstacle = this.obstacles.get(id);
    if (obstacle) {
      this.removeFromGrid(obstacle);
      this.obstacles.delete(id);

      // Handle linked teleporters
      if (obstacle.type === 'TELEPORTER' && obstacle.linkedTeleporterId) {
        this.removeObstacle(obstacle.linkedTeleporterId);
      }

      logger.debug('Obstacle removed', {
        id,
        type: obstacle.type,
        position: { x: obstacle.x, y: obstacle.y }
      });
    }
  }

  update() {
    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateInterval) return;

    // Update obstacle states
    for (const [id, obstacle] of this.obstacles) {
      if (obstacle.type === 'BREAKABLE' && obstacle.currentHealth <= 0) {
        this.removeObstacle(id);
        logger.debug('Breakable obstacle destroyed', { obstacleId: id });
      }
    }

    // Clean expired teleporter cooldowns
    for (const [id, lastUsed] of this.teleporterCooldowns) {
      if (now - lastUsed >= this.obstacleTypes.TELEPORTER.cooldown) {
        this.teleporterCooldowns.delete(id);
        logger.debug('Teleporter cooldown expired', { teleporterId: id });
      }
    }

    this.lastUpdateTime = now;
  }

  createObstacle(type, x, y, options = {}) {
    if (this.obstacles.size >= this.maxObstacles) {
      logger.warn('Maximum obstacle limit reached', { 
        current: this.obstacles.size, 
        max: this.maxObstacles 
      });
      return null;
    }

    const obstacleType = this.obstacleTypes[type];
    if (!obstacleType) {
      logger.error('Invalid obstacle type', { type });
      throw new Error(`Invalid obstacle type: ${type}`);
    }

    const id = `obstacle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const obstacle = {
      id,
      type,
      x,
      y,
      width: options.width || obstacleType.defaultWidth,
      height: options.height || obstacleType.defaultHeight,
      rotation: options.rotation || 0,
      ...obstacleType,
      ...options
    };

    // Add type-specific properties
    switch (type) {
      case 'BREAKABLE':
        obstacle.currentHealth = obstacle.health;
        break;
      case 'TELEPORTER':
        if (!options.linkedTeleporterId) {
          const linkedPos = this.findTeleporterLocation(x, y);
          const linkedTeleporter = this.createObstacle('TELEPORTER', 
            linkedPos.x, linkedPos.y, 
            { linkedTeleporterId: id }
          );
          if (linkedTeleporter) {
            obstacle.linkedTeleporterId = linkedTeleporter.id;
            logger.debug('Teleporter pair created', {
              teleporter1: id,
              teleporter2: linkedTeleporter.id
            });
          }
        }
        break;
    }

    // Add to management structures
    this.obstacles.set(id, obstacle);
    this.addToGrid(obstacle);

    logger.debug('Obstacle created', {
      id,
      type,
      position: { x, y },
      dimensions: { width: obstacle.width, height: obstacle.height }
    });

    return obstacle;
  }

  findTeleporterLocation(sourceX, sourceY) {
    const minDistance = 500;
    const maxAttempts = 10;
    
    for (let i = 0; i < maxAttempts; i++) {
      const x = Math.random() * this.worldSize;
      const y = Math.random() * this.worldSize;
      
      const distance = Math.hypot(x - sourceX, y - sourceY);
      if (distance >= minDistance && !this.isLocationOccupied(x, y)) {
        return { x, y };
      }
    }
    
    logger.warn('Failed to find suitable teleporter location, using fallback');
    return {
      x: Math.random() * this.worldSize,
      y: Math.random() * this.worldSize
    };
  }

  isLocationOccupied(x, y, radius = 100) {
    const nearbyObstacles = this.getNearbyObstacles(x, y, radius);
    return nearbyObstacles.length > 0;
  }

  addToGrid(obstacle) {
    const cells = this.getCellsForObstacle(obstacle);
    cells.forEach(([x, y]) => {
      if (this.grid[x]?.[y]) {
        this.grid[x][y].add(obstacle.id);
      }
    });
  }

  removeFromGrid(obstacle) {
    const cells = this.getCellsForObstacle(obstacle);
    cells.forEach(([x, y]) => {
      if (this.grid[x]?.[y]) {
        this.grid[x][y].delete(obstacle.id);
      }
    });
  }

  getCellsForObstacle(obstacle) {
    const startX = Math.floor((obstacle.x - obstacle.width/2) / this.cellSize);
    const endX = Math.floor((obstacle.x + obstacle.width/2) / this.cellSize);
    const startY = Math.floor((obstacle.y - obstacle.height/2) / this.cellSize);
    const endY = Math.floor((obstacle.y + obstacle.height/2) / this.cellSize);
    
    const cells = [];
    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        if (x >= 0 && x < this.grid.length && y >= 0 && y < this.grid[0].length) {
          cells.push([x, y]);
        }
      }
    }
    return cells;
  }

  getNearbyObstacles(x, y, radius) {
    const gridX = Math.floor(x / this.cellSize);
    const gridY = Math.floor(y / this.cellSize);
    const cellRadius = Math.ceil(radius / this.cellSize);
    const nearbyObstacles = new Set();

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const checkX = gridX + dx;
        const checkY = gridY + dy;
        
        if (checkX >= 0 && checkX < this.grid.length && 
            checkY >= 0 && checkY < this.grid[0].length) {
          this.grid[checkX][checkY].forEach(obstacleId => {
            const obstacle = this.obstacles.get(obstacleId);
            if (obstacle) {
              const distance = Math.hypot(x - obstacle.x, y - obstacle.y);
              if (distance <= radius) {
                nearbyObstacles.add(obstacle);
              }
            }
          });
        }
      }
    }

    return Array.from(nearbyObstacles);
  }

  handleCollision(entity, obstacle) {
    const result = {
      collision: false,
      damage: 0,
      effect: null,
      bounce: null
    };

    if (this.checkCollision(entity, obstacle)) {
      result.collision = true;
      logger.debug('Collision detected', {
        entityId: entity.id,
        obstacleId: obstacle.id,
        obstacleType: obstacle.type
      });

      switch (obstacle.type) {
        case 'WALL':
        case 'BREAKABLE':
        case 'SPIKE':
          if (obstacle.solid) {
            const bounce = this.calculateBounce(entity, obstacle);
            result.bounce = bounce;
            result.damage = obstacle.damage;
          }
          break;

        case 'SLIME':
          result.effect = {
            type: 'speed',
            multiplier: obstacle.speedMultiplier,
            duration: 2000
          };
          break;

        case 'TELEPORTER':
          const teleportResult = this.handleTeleport(entity, obstacle);
          if (teleportResult) {
            result.effect = teleportResult;
          }
          break;
      }

      if (obstacle.destructible && result.collision) {
        this.damageObstacle(obstacle.id, entity.mass * 10);
      }
    }

    return result;
  }

  checkCollision(entity, obstacle) {
    // Rectangular collision detection
    const entityLeft = entity.x - entity.radius;
    const entityRight = entity.x + entity.radius;
    const entityTop = entity.y - entity.radius;
    const entityBottom = entity.y + entity.radius;
    
    const obstacleLeft = obstacle.x - obstacle.width/2;
    const obstacleRight = obstacle.x + obstacle.width/2;
    const obstacleTop = obstacle.y - obstacle.height/2;
    const obstacleBottom = obstacle.y + obstacle.height/2;

    return entityRight >= obstacleLeft && entityLeft <= obstacleRight &&
           entityBottom >= obstacleTop && entityTop <= obstacleBottom;
  }

  calculateBounce(entity, obstacle) {
    const centerX = obstacle.x;
    const centerY = obstacle.y;
    const angle = Math.atan2(entity.y - centerY, entity.x - centerX);
    
    return {
      x: Math.cos(angle) * obstacle.bounceForce,
      y: Math.sin(angle) * obstacle.bounceForce
    };
  }

  handleTeleport(entity, obstacle) {
    const now = Date.now();
    const lastUsed = this.teleporterCooldowns.get(obstacle.id) || 0;
    
    if (now - lastUsed >= obstacle.cooldown) {
      const linkedTeleporter = this.obstacles.get(obstacle.linkedTeleporterId);
      if (linkedTeleporter) {
        this.teleporterCooldowns.set(obstacle.id, now);
        this.teleporterCooldowns.set(linkedTeleporter.id, now);
        
        logger.debug('Entity teleported', {
          entityId: entity.id,
          fromTeleporter: obstacle.id,
          toTeleporter: linkedTeleporter.id
        });

        return {
          type: 'teleport',
          x: linkedTeleporter.x,
          y: linkedTeleporter.y
        };
      }
    }
    return null;
  }

  damageObstacle(obstacleId, damage) {
    const obstacle = this.obstacles.get(obstacleId);
    if (!obstacle || !obstacle.destructible) return false;

    obstacle.currentHealth -= damage;
    logger.debug('Obstacle damaged', {
      obstacleId,
      damage,
      remainingHealth: obstacle.currentHealth
    });
    
    if (obstacle.currentHealth <= 0) {
      this.removeObstacle(obstacleId);
      return true;
    }
    
    return false;
  }

  generateMap(template) {
    this.clear();
    logger.info('Generating new obstacle map', {
      hasTemplate: !!template,
      worldSize: this.worldSize
    });

    if (!template) {
      this.generateRandomObstacles();
      return;
    }

    template.forEach(obstacleData => {
      try {
        this.createObstacle(
          obstacleData.type,
          obstacleData.x,
          obstacleData.y,
          obstacleData.options
        );
      } catch (error) {
        logger.error('Failed to create obstacle from template', {
          obstacleData,
          error: error.message
        });
      }
    });
  }

  generateRandomObstacles() {
    const obstacleCount = Math.floor(this.worldSize / 200);
    logger.info('Generating random obstacles', {
      targetCount: obstacleCount
    });
    
    for (let i = 0; i < obstacleCount; i++) {
      const type = this.getRandomObstacleType();
      const x = Math.random() * this.worldSize;
      const y = Math.random() * this.worldSize;
      
      if (!this.isLocationOccupied(x, y)) {
        this.createObstacle(type, x, y);
      }
    }
  }

  getRandomObstacleType() {
    const types = Object.keys(this.obstacleTypes);
    return types[Math.floor(Math.random() * types.length)];
  }

  clear() {
    const obstacleCount = this.obstacles.size;
    this.obstacles.clear();
    this.grid = this.initializeGrid();
    this.teleporterCooldowns.clear();
    
    logger.info('Obstacle system cleared', {
      clearedObstacles: obstacleCount
    });
  }

  getObstacles() {
    return Array.from(this.obstacles.values());
  }

  getObstacleById(id) {
    return this.obstacles.get(id);
  }
} 