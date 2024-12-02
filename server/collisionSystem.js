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
  constructor(worldSize) {
    // Validate and sanitize worldSize
    this.worldSize = Math.max(
      COLLISION_CONFIG.MIN_WORLD_SIZE,
      Math.min(COLLISION_CONFIG.MAX_WORLD_SIZE, Number(worldSize) || 4000)
    );
    
    this.cellSize = COLLISION_CONFIG.CELL_SIZE;
    this.gridSize = Math.max(1, Math.min(100, Math.ceil(this.worldSize / this.cellSize)));
    this.grid = this.initializeGrid();
    
    logger.info('CollisionSystem initialized', {
      cellSize: this.cellSize,
      config: COLLISION_CONFIG,
      gridSize: this.gridSize,
      worldSize: this.worldSize
    });
  }

  initializeGrid() {
    try {
      return Array(this.gridSize).fill(null).map(() => 
        Array(this.gridSize).fill(null).map(() => new Set())
      );
    } catch (error) {
      logger.error('Failed to initialize collision grid', {
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

  checkCollisions(players, food) {
    const collisions = [];
    
    // Update spatial grid
    this.updateGrid(players, food);

    // Check player-food collisions
    for (const player of players) {
      const nearbyFood = this.getNearbyEntities(player, food);
      for (const foodItem of nearbyFood) {
        if (this.checkCollision(player, foodItem)) {
          collisions.push({
            type: 'player-food',
            entity1: player,
            entity2: foodItem
          });
        }
      }
    }

    // Check player-player collisions
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const player1 = players[i];
        const player2 = players[j];
        
        if (this.checkCollision(player1, player2)) {
          collisions.push({
            type: 'player-player',
            entity1: player1,
            entity2: player2
          });
        }
      }
    }

    return collisions;
  }

  updateGrid(players, food) {
    // Clear grid
    this.grid = this.initializeGrid();

    // Add players to grid
    for (const player of players) {
      const cell = this.getGridCell(player.x, player.y);
      if (this.grid[cell.x]?.[cell.y]) {
        this.grid[cell.x][cell.y].add(player.id);
      }
    }

    // Add food to grid
    for (const foodItem of food) {
      const cell = this.getGridCell(foodItem.x, foodItem.y);
      if (this.grid[cell.x]?.[cell.y]) {
        this.grid[cell.x][cell.y].add(foodItem.id);
      }
    }
  }

  checkCollision(entity1, entity2) {
    const dx = entity1.x - entity2.x;
    const dy = entity1.y - entity2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (entity1.radius + entity2.radius);
  }

  getGridCell(x, y) {
    return {
      x: Math.floor(x / this.cellSize),
      y: Math.floor(y / this.cellSize)
    };
  }

  getNearbyEntities(entity, entities) {
    const cell = this.getGridCell(entity.x, entity.y);
    const nearby = new Set();

    // Check surrounding cells
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const checkX = cell.x + dx;
        const checkY = cell.y + dy;
        
        if (checkX >= 0 && checkX < this.gridSize && 
            checkY >= 0 && checkY < this.gridSize) {
          this.grid[checkX][checkY].forEach(id => {
            const foundEntity = entities.find(e => e.id === id);
            if (foundEntity) {
              nearby.add(foundEntity);
            }
          });
        }
      }
    }

    return Array.from(nearby);
  }
} 