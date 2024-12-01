import { config } from './utils/config.js';
import { logger } from './utils/logger.js';

// Collision configuration constants
const COLLISION_CONFIG = {
  CELL_SIZE: 100,
  MIN_WORLD_SIZE: 1000,
  MAX_WORLD_SIZE: 10000,
  NEW_BLOB_PROTECTION_TIME: 5000,
  MIN_SIZE_RATIO: 1.25,
  BOUNCE_FORCE: 5,
  GROWTH_THRESHOLD: 35,
  COLLISION_COOLDOWN: 1000,
  SPLIT_COOLDOWN: 10000,
  MERGE_COOLDOWN: 15000,
  POWER_UP_RADIUS: 50,
  MAX_VELOCITY: 50,
  BOUNCE_DAMPENING: 0.8,
  TEAM_BOOST_FACTOR: 1.2
};

export class CollisionSystem {
  constructor(worldSize = config.worldSize) {
    this.worldSize = Math.max(
      COLLISION_CONFIG.MIN_WORLD_SIZE,
      Math.min(COLLISION_CONFIG.MAX_WORLD_SIZE, Number(worldSize))
    );
    
    this.cellSize = COLLISION_CONFIG.CELL_SIZE;
    this.gridSize = Math.ceil(this.worldSize / this.cellSize);
    this.grid = this.initializeGrid();
    
    // Collision state tracking
    this.lastCollisions = new Map();
    this.protectedBlobs = new Set();
    this.splitPairs = new Map();
    this.teamBoosts = new Map();
    
    // Performance monitoring
    this.collisionStats = {
      totalChecks: 0,
      actualCollisions: 0,
      lastReset: Date.now()
    };

    logger.info('CollisionSystem initialized', {
      worldSize: this.worldSize,
      cellSize: this.cellSize,
      gridSize: this.gridSize,
      config: COLLISION_CONFIG
    });
  }

  initializeGrid() {
    try {
      const size = Math.ceil(this.worldSize / this.cellSize);
      return Array(size).fill(null)
        .map(() => Array(size).fill(null)
          .map(() => new Map()));
    } catch (error) {
      logger.error('Failed to initialize collision grid', { error });
      throw new Error('Failed to initialize collision system');
    }
  }

  updateGrid(entities) {
    try {
      // Clear grid efficiently
      for (let i = 0; i < this.gridSize; i++) {
        for (let j = 0; j < this.gridSize; j++) {
          this.grid[i][j].clear();
        }
      }

      // Add entities to grid
      entities.forEach(entity => {
        if (!entity || !this.isValidEntity(entity)) return;
        
        const cells = this.getCellsForEntity(entity);
        cells.forEach(([x, y]) => {
          if (this.grid[x]?.[y]) {
            this.grid[x][y].set(entity.id, entity);
          }
        });
      });
    } catch (error) {
      logger.error('Error updating collision grid', { error });
    }
  }

  isValidEntity(entity) {
    return entity && 
           typeof entity.x === 'number' && 
           typeof entity.y === 'number' && 
           (typeof entity.radius === 'number' || typeof entity.size === 'number');
  }

  getCellsForEntity(entity) {
    const cells = new Set();
    const radius = entity.radius || entity.size || 0;
    
    const minX = Math.max(0, Math.floor((entity.x - radius) / this.cellSize));
    const maxX = Math.min(this.gridSize - 1, Math.floor((entity.x + radius) / this.cellSize));
    const minY = Math.max(0, Math.floor((entity.y - radius) / this.cellSize));
    const maxY = Math.min(this.gridSize - 1, Math.floor((entity.y + radius) / this.cellSize));

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        cells.add([x, y]);
      }
    }
    return cells;
  }

  detectCollisions(data) {
    try {
      const collisions = [];
      const { players, food, powerUps, obstacles } = data;
      
      // Update performance stats
      this.updateCollisionStats();

      // Update spatial grid
      this.updateGrid([
        ...players,
        ...food,
        ...(powerUps || []),
        ...(obstacles || [])
      ]);

      // Process player collisions
      players.forEach(player => {
        if (this.isProtected(player)) return;

        const nearbyEntities = this.getNearbyEntities(player);
        
        // Player collisions
        this.processPlayerCollisions(player, nearbyEntities.players, collisions);
        
        // Food collisions
        this.processFoodCollisions(player, nearbyEntities.food, collisions);
        
        // Power-up collisions
        this.processPowerUpCollisions(player, nearbyEntities.powerUps, collisions);
        
        // Obstacle collisions
        this.processObstacleCollisions(player, nearbyEntities.obstacles, collisions);
      });

      return collisions;
    } catch (error) {
      logger.error('Error detecting collisions', { error });
      return [];
    }
  }

  processPlayerCollisions(player, nearbyPlayers, collisions) {
    nearbyPlayers.forEach(other => {
      this.collisionStats.totalChecks++;
      
      if (this.checkPlayerCollision(player, other)) {
        const result = this.resolvePlayerCollision(player, other);
        if (result) {
          this.collisionStats.actualCollisions++;
          collisions.push({
            type: 'player',
            entities: [player, other],
            result
          });
          
          logger.debug('Player collision resolved', {
            player1: { id: player.id, radius: player.radius },
            player2: { id: other.id, radius: other.radius },
            result: result.type
          });
        }
      }
    });
  }

  processFoodCollisions(player, nearbyFood, collisions) {
    nearbyFood.forEach(food => {
      if (this.checkFoodCollision(player, food)) {
        collisions.push({
          type: 'food',
          entities: [player, food]
        });
      }
    });
  }

  processPowerUpCollisions(player, nearbyPowerUps, collisions) {
    nearbyPowerUps?.forEach(powerUp => {
      if (this.checkPowerUpCollision(player, powerUp)) {
        collisions.push({
          type: 'powerup',
          entities: [player, powerUp]
        });
      }
    });
  }

  processObstacleCollisions(player, nearbyObstacles, collisions) {
    nearbyObstacles?.forEach(obstacle => {
      if (this.checkObstacleCollision(player, obstacle)) {
        const bounceResult = this.handleObstacleBounce(player, obstacle);
        collisions.push({
          type: 'obstacle',
          entities: [player, obstacle],
          result: bounceResult
        });
      }
    });
  }

  getNearbyEntities(entity) {
    const nearby = {
      players: new Set(),
      food: new Set(),
      powerUps: new Set(),
      obstacles: new Set()
    };

    const cells = this.getCellsForEntity(entity);
    cells.forEach(([x, y]) => {
      if (!this.grid[x]?.[y]) return;
      
      this.grid[x][y].forEach(other => {
        if (other.id === entity.id) return;

        switch(other.type) {
          case 'food':
            nearby.food.add(other);
            break;
          case 'powerup':
            nearby.powerUps.add(other);
            break;
          case 'obstacle':
            nearby.obstacles.add(other);
            break;
          default:
            nearby.players.add(other);
        }
      });
    });

    return nearby;
  }

  checkPlayerCollision(player1, player2) {
    // Skip invalid collisions
    if (!this.isValidCollisionPair(player1, player2)) return false;

    // Check distance and size ratio
    const distance = this.getDistance(player1, player2);
    const sumRadii = player1.radius + player2.radius;

    if (distance < sumRadii) {
      const ratio = player1.radius / player2.radius;
      
      if (this.canConsume(ratio)) {
        this.recordCollision(player1, player2);
        return true;
      } else if (this.canMerge(player1, player2)) {
        return true;
      } else {
        this.handleBounce(player1, player2);
      }
    }

    return false;
  }

  isValidCollisionPair(player1, player2) {
    // Skip same player or team
    if (player1.id === player2.id || 
        (player1.teamId && player1.teamId === player2.teamId)) {
      return false;
    }

    // Check cooldown
    const collisionKey = this.getCollisionKey(player1, player2);
    const now = Date.now();
    if (this.lastCollisions.get(collisionKey) > now - COLLISION_CONFIG.COLLISION_COOLDOWN) {
      return false;
    }

    // Check protection
    if (this.isProtected(player1) || this.isProtected(player2)) {
      return false;
    }

    return true;
  }

  canConsume(ratio) {
    return ratio > COLLISION_CONFIG.MIN_SIZE_RATIO || 
           ratio < 1 / COLLISION_CONFIG.MIN_SIZE_RATIO;
  }

  canMerge(player1, player2) {
    if (!this.areSplitPieces(player1, player2)) return false;

    const now = Date.now();
    const splitTime = this.splitPairs.get(this.getCollisionKey(player1, player2));
    return splitTime && now - splitTime >= COLLISION_CONFIG.MERGE_COOLDOWN;
  }

  handleBounce(player1, player2) {
    const angle = Math.atan2(player2.y - player1.y, player2.x - player1.x);
    const force = COLLISION_CONFIG.BOUNCE_FORCE;
    const massRatio1 = player2.radius / (player1.radius + player2.radius);
    const massRatio2 = player1.radius / (player1.radius + player2.radius);

    // Apply team boost if applicable
    const boostFactor = this.getTeamBoostFactor(player1, player2);

    // Calculate velocities
    const velocity1 = {
      x: -Math.cos(angle) * force * massRatio1 * boostFactor,
      y: -Math.sin(angle) * force * massRatio1 * boostFactor
    };

    const velocity2 = {
      x: Math.cos(angle) * force * massRatio2 * boostFactor,
      y: Math.sin(angle) * force * massRatio2 * boostFactor
    };

    // Apply velocity with dampening
    this.applyVelocity(player1, velocity1);
    this.applyVelocity(player2, velocity2);
  }

  applyVelocity(player, velocity) {
    // Clamp velocity to maximum
    const speed = Math.hypot(velocity.x, velocity.y);
    if (speed > COLLISION_CONFIG.MAX_VELOCITY) {
      const scale = COLLISION_CONFIG.MAX_VELOCITY / speed;
      velocity.x *= scale;
      velocity.y *= scale;
    }

    // Apply dampening
    velocity.x *= COLLISION_CONFIG.BOUNCE_DAMPENING;
    velocity.y *= COLLISION_CONFIG.BOUNCE_DAMPENING;

    // Update player velocity
    player.velocity = player.velocity || { x: 0, y: 0 };
    player.velocity.x += velocity.x;
    player.velocity.y += velocity.y;
  }

  getTeamBoostFactor(player1, player2) {
    // Check if players are on the same team
    if (player1.teamId && player1.teamId === player2.teamId) {
      return COLLISION_CONFIG.TEAM_BOOST_FACTOR;
    }
    return 1;
  }

  handleObstacleBounce(player, obstacle) {
    // Calculate bounce direction
    const dx = player.x - obstacle.x;
    const dy = player.y - obstacle.y;
    const angle = Math.atan2(dy, dx);
    
    // Apply bounce force
    const velocity = {
      x: Math.cos(angle) * COLLISION_CONFIG.BOUNCE_FORCE,
      y: Math.sin(angle) * COLLISION_CONFIG.BOUNCE_FORCE
    };

    this.applyVelocity(player, velocity);

    return { velocity };
  }

  resolvePlayerCollision(player1, player2) {
    const ratio = player1.radius / player2.radius;
    
    if (ratio > COLLISION_CONFIG.MIN_SIZE_RATIO) {
      return {
        type: 'consume',
        winner: player1,
        loser: player2
      };
    } else if (ratio < 1 / COLLISION_CONFIG.MIN_SIZE_RATIO) {
      return {
        type: 'consume',
        winner: player2,
        loser: player1
      };
    } else if (this.canMerge(player1, player2)) {
      return {
        type: 'merge',
        entities: [player1, player2]
      };
    }
    
    return null;
  }

  checkFoodCollision(player, food) {
    const distance = this.getDistance(player, food);
    return distance < player.radius + (food.radius || food.size || 5);
  }

  checkPowerUpCollision(player, powerUp) {
    const distance = this.getDistance(player, powerUp);
    return distance < player.radius + COLLISION_CONFIG.POWER_UP_RADIUS;
  }

  checkObstacleCollision(player, obstacle) {
    // Rectangle-circle collision detection
    const distX = Math.abs(player.x - obstacle.x);
    const distY = Math.abs(player.y - obstacle.y);

    if (distX > obstacle.width/2 + player.radius) return false;
    if (distY > obstacle.height/2 + player.radius) return false;

    if (distX <= obstacle.width/2) return true;
    if (distY <= obstacle.height/2) return true;

    const dx = distX - obstacle.width/2;
    const dy = distY - obstacle.height/2;
    return (dx * dx + dy * dy <= player.radius * player.radius);
  }

  getDistance(entity1, entity2) {
    return Math.hypot(entity1.x - entity2.x, entity1.y - entity2.y);
  }

  getCollisionKey(entity1, entity2) {
    return entity1.id < entity2.id ? 
      `${entity1.id}-${entity2.id}` : 
      `${entity2.id}-${entity1.id}`;
  }

  recordCollision(entity1, entity2) {
    this.lastCollisions.set(
      this.getCollisionKey(entity1, entity2),
      Date.now()
    );
  }

  recordSplit(player1, player2) {
    this.splitPairs.set(
      this.getCollisionKey(player1, player2),
      Date.now()
    );
  }

  areSplitPieces(player1, player2) {
    return this.splitPairs.has(this.getCollisionKey(player1, player2));
  }

  isProtected(player) {
    if (!player) return false;
    
    // Check size-based protection
    if (player.radius < COLLISION_CONFIG.GROWTH_THRESHOLD) {
      return true;
    }

    // Check time-based protection
    if (this.protectedBlobs.has(player.id)) {
      const protectionStart = this.protectedBlobs.get(player.id);
      if (Date.now() - protectionStart < COLLISION_CONFIG.NEW_BLOB_PROTECTION_TIME) {
        return true;
      } else {
        this.protectedBlobs.delete(player.id);
      }
    }

    return false;
  }

  addProtectedBlob(blobId) {
    this.protectedBlobs.set(blobId, Date.now());
  }

  updateCollisionStats() {
    const now = Date.now();
    if (now - this.collisionStats.lastReset > 60000) { // Reset every minute
      logger.info('Collision system performance', {
        totalChecks: this.collisionStats.totalChecks,
        actualCollisions: this.collisionStats.actualCollisions,
        efficiency: this.collisionStats.actualCollisions / this.collisionStats.totalChecks
      });
      
      this.collisionStats = {
        totalChecks: 0,
        actualCollisions: 0,
        lastReset: now
      };
    }
  }

  clear() {
    this.lastCollisions.clear();
    this.protectedBlobs.clear();
    this.splitPairs.clear();
    this.teamBoosts.clear();
    this.grid = this.initializeGrid();
    
    logger.info('Collision system cleared');
  }
} 