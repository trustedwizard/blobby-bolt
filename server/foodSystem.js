import { config } from './utils/config.js';
import { logger } from './utils/logger.js';

// Food types with their properties
const FOOD_TYPES = {
  NORMAL: { 
    chance: 0.7, 
    points: 1, 
    growth: 1.005,
    size: 10,
    color: 0xFFFFFF
  },
  SUPER: { 
    chance: 0.2, 
    points: 2, 
    growth: 1.008,
    size: 15,
    color: 0xFFAA00
  },
  MEGA: { 
    chance: 0.08, 
    points: 5, 
    growth: 1.015,
    size: 20,
    color: 0xFF5500
  },
  ULTRA: { 
    chance: 0.02, 
    points: 10, 
    growth: 1.025,
    size: 25,
    color: 0xFF0000
  }
};

export class FoodSystem {
  constructor(worldSize = config.worldSize, minFoodPerPlayer = 10, maxFoodPerPlayer = 15) {
    // Validate and sanitize worldSize
    this.worldSize = Math.max(1000, Math.min(10000, Number(worldSize) || 4000));
    this.minFoodPerPlayer = minFoodPerPlayer;
    this.maxFoodPerPlayer = maxFoodPerPlayer;
    this.maxTotalFood = 300;
    this.foodItems = new Map();
    this.cellSize = 100;
    this.gridSize = Math.max(1, Math.min(100, Math.ceil(this.worldSize / this.cellSize)));
    this.grid = this.initializeGrid();
    this.despawnTime = 30000;
    this.lastSpawnTime = Date.now();
    this.spawnCooldown = 1000;
    this.foodTypes = FOOD_TYPES;
    this.ejectedMassDecayTime = 10000;
    this.maxFoodPerCell = 5;
    this.minDistanceBetweenFood = 20;
    this.lastCleanupTime = Date.now();
    this.cleanupInterval = 5000;

    logger.info('FoodSystem initialized', {
      worldSize: this.worldSize,
      minFoodPerPlayer,
      maxFoodPerPlayer,
      maxTotalFood: this.maxTotalFood,
      cellSize: this.cellSize,
      gridSize: this.gridSize,
      foodTypes: Object.keys(this.foodTypes)
    });
  }

  initializeGrid() {
    try {
      return Array(this.gridSize).fill(null).map(() => 
        Array(this.gridSize).fill(null).map(() => new Set())
      );
    } catch (error) {
      logger.error('Failed to initialize food grid', {
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

  getAllFood() {
    return Array.from(this.foodItems.values());
  }

  update(playerCount) {
    const now = Date.now();

    // Cleanup expired food
    if (now - this.lastCleanupTime > this.cleanupInterval) {
      this.cleanupExpiredFood();
      this.lastCleanupTime = now;
    }

    // Spawn new food if needed
    const targetFoodCount = this.calculateTargetFoodCount(playerCount);
    if (this.foodItems.size < targetFoodCount && 
        now - this.lastSpawnTime > this.spawnCooldown) {
      const numToSpawn = Math.min(
        5, // Spawn up to 5 at a time
        targetFoodCount - this.foodItems.size
      );
      const newFood = this.spawnFood(numToSpawn);
      logger.debug('Food spawned', {
        spawnCount: newFood.length,
        currentTotal: this.foodItems.size,
        targetTotal: targetFoodCount
      });
      this.lastSpawnTime = now;
    }
  }

  calculateTargetFoodCount(playerCount) {
    const baseCount = Math.max(
      this.minFoodPerPlayer * playerCount,
      this.minFoodPerPlayer * 2 // Minimum food even with no players
    );
    return Math.min(baseCount, this.maxTotalFood);
  }

  spawnFood(count, players = []) {
    const newFood = [];
    for (let i = 0; i < count; i++) {
      const location = this.findSpawnLocation(players);
      if (location) {
        const food = this.createFood(location);
        this.addFood(food);
        newFood.push(food);
      } else {
        logger.warn('Failed to find suitable food spawn location', {
          attempt: i + 1,
          maxAttempts: count
        });
      }
    }
    return newFood;
  }

  createFood(location) {
    const type = this.selectFoodType();
    const properties = this.foodTypes[type];
    
    return {
      id: `food-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: location.x,
      y: location.y,
      type: type,
      size: properties.size,
      points: properties.points,
      growth: properties.growth,
      color: properties.color,
      spawnTime: Date.now()
    };
  }

  selectFoodType() {
    const rand = Math.random();
    let cumulativeChance = 0;
    
    for (const [type, properties] of Object.entries(this.foodTypes)) {
      cumulativeChance += properties.chance;
      if (rand <= cumulativeChance) {
        return type;
      }
    }
    
    return 'NORMAL'; // Fallback
  }

  findSpawnLocation(players) {
    const maxAttempts = 10;
    
    for (let i = 0; i < maxAttempts; i++) {
      const x = Math.random() * this.worldSize;
      const y = Math.random() * this.worldSize;
      
      // Check distance from players
      const tooCloseToPlayer = players.some(player => {
        const distance = Math.hypot(x - player.x, y - player.y);
        return distance < player.radius * 3;
      });
      
      // Check distance from other food
      if (!tooCloseToPlayer && !this.isTooCloseToFood(x, y)) {
        return { x, y };
      }
    }
    
    logger.debug('Using fallback spawn location after max attempts');
    return {
      x: Math.random() * this.worldSize,
      y: Math.random() * this.worldSize
    };
  }

  isTooCloseToFood(x, y) {
    const nearbyFood = this.getFoodNearPoint(x, y, this.minDistanceBetweenFood);
    return nearbyFood.length > 0;
  }

  getFoodNearPoint(x, y, radius) {
    const gridX = Math.floor(x / this.cellSize);
    const gridY = Math.floor(y / this.cellSize);
    const cellRadius = Math.ceil(radius / this.cellSize);
    const nearbyFood = [];

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const checkX = gridX + dx;
        const checkY = gridY + dy;
        
        if (this.grid[checkX]?.[checkY]) {
          for (const foodId of this.grid[checkX][checkY]) {
            const food = this.foodItems.get(foodId);
            if (food) {
              const distance = Math.hypot(x - food.x, y - food.y);
              if (distance <= radius) {
                nearbyFood.push(food);
              }
            }
          }
        }
      }
    }

    return nearbyFood;
  }

  addFood(food) {
    this.foodItems.set(food.id, food);
    const gridX = Math.floor(food.x / this.cellSize);
    const gridY = Math.floor(food.y / this.cellSize);
    
    if (this.grid[gridX]?.[gridY]) {
      this.grid[gridX][gridY].add(food.id);
    }

    logger.debug('Food added', {
      foodId: food.id,
      type: food.type,
      position: { x: food.x, y: food.y },
      gridCell: { x: gridX, y: gridY }
    });
  }

  removeFood(foodId) {
    const food = this.foodItems.get(foodId);
    if (food) {
      const gridX = Math.floor(food.x / this.cellSize);
      const gridY = Math.floor(food.y / this.cellSize);
      
      if (this.grid[gridX]?.[gridY]) {
        this.grid[gridX][gridY].delete(food.id);
      }
      
      this.foodItems.delete(foodId);

      logger.debug('Food removed', {
        foodId,
        type: food.type,
        position: { x: food.x, y: food.y }
      });
    }
  }

  cleanupExpiredFood() {
    const now = Date.now();
    let cleanupCount = 0;
    
    for (const [id, food] of this.foodItems.entries()) {
      if (food.type === 'ejected' && now - food.spawnTime > this.ejectedMassDecayTime) {
        this.removeFood(id);
        cleanupCount++;
      }
    }

    if (cleanupCount > 0) {
      logger.debug('Expired food cleaned up', {
        cleanupCount,
        remainingFood: this.foodItems.size
      });
    }
  }

  addEjectedMass(ejectedMass) {
    const food = {
      ...ejectedMass,
      type: 'ejected',
      size: 15,
      points: 2,
      growth: 1.003,
      color: ejectedMass.color || 0xCCCCCC,
      spawnTime: Date.now()
    };

    this.addFood(food);
    logger.debug('Ejected mass added', {
      foodId: food.id,
      playerId: ejectedMass.playerId,
      position: { x: food.x, y: food.y }
    });

    return food;
  }

  clear() {
    const foodCount = this.foodItems.size;
    this.foodItems.clear();
    this.grid = this.initializeGrid();
    logger.info('Food system cleared', {
      clearedFoodCount: foodCount
    });
  }

  getFoodCount() {
    return this.foodItems.size;
  }

  generateInitialFood(playerCount = 1) {
    const targetCount = this.calculateTargetFoodCount(playerCount);
    logger.info('Generating initial food', {
      targetCount,
      playerCount
    });
    return this.spawnFood(targetCount);
  }
} 