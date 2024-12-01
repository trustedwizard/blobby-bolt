// Move FOOD_TYPES outside the class
const FOOD_TYPES = {
  NORMAL: { chance: 1, points: 1, growth: 1.005 }
};

export class FoodSystem {
  constructor(worldSize, minFoodPerPlayer = 10, maxFoodPerPlayer = 15) {
    this.worldSize = worldSize;
    this.minFoodPerPlayer = minFoodPerPlayer;
    this.maxFoodPerPlayer = maxFoodPerPlayer;
    this.maxTotalFood = 300;
    this.foodItems = new Map();
    this.grid = this.initializeGrid();
    this.despawnTime = 30000;
    this.lastSpawnTime = Date.now();
    this.spawnCooldown = 1000;
    this.foodTypes = FOOD_TYPES;
  }

  initializeGrid(cellSize = 100) {
    const gridSize = Math.ceil(this.worldSize / cellSize);
    return Array(gridSize).fill(null).map(() => 
      Array(gridSize).fill(0)
    );
  }

  calculateTargetFoodCount(playerCount) {
    const baseCount = playerCount * this.minFoodPerPlayer;
    return Math.min(baseCount, this.maxTotalFood);
  }

  getFoodInCell(x, y) {
    const gridX = Math.floor(x / 100);
    const gridY = Math.floor(y / 100);
    return this.grid[gridX]?.[gridY] || 0;
  }

  updateGridCell(x, y, increment = true) {
    const gridX = Math.floor(x / 100);
    const gridY = Math.floor(y / 100);
    if (this.grid[gridX]?.[gridY] !== undefined) {
      this.grid[gridX][gridY] += increment ? 1 : -1;
    }
  }

  findSpawnLocation(players) {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const x = Math.random() * this.worldSize;
      const y = Math.random() * this.worldSize;
      
      // Check grid density
      if (this.getFoodInCell(x, y) >= 3) {
        attempts++;
        continue;
      }
      
      // Check distance from players
      const tooCloseToPlayer = players.some(player => {
        const distance = Math.hypot(player.x - x, player.y - y);
        return distance < player.radius * 3;
      });
      
      if (!tooCloseToPlayer) {
        return { x, y };
      }
      
      attempts++;
    }
    
    // Fallback to random position if no suitable location found
    return {
      x: Math.random() * this.worldSize,
      y: Math.random() * this.worldSize
    };
  }

  spawnFood(count, players) {
    const now = Date.now();
    if (now - this.lastSpawnTime < this.spawnCooldown) return [];
    
    const newFood = [];
    for (let i = 0; i < count; i++) {
      const location = this.findSpawnLocation(players);
      const food = {
        id: `food-${now}-${Math.random().toString(36).substr(2, 9)}`,
        x: location.x,
        y: location.y,
        color: Math.random() * 0xFFFFFF,
        size: 10,
        spawnTime: now,
        type: 'normal'
      };
      
      this.foodItems.set(food.id, food);
      this.updateGridCell(food.x, food.y, true);
      newFood.push(food);
    }
    
    this.lastSpawnTime = now;
    return newFood;
  }

  removeFood(foodId) {
    const food = this.foodItems.get(foodId);
    if (food) {
      this.updateGridCell(food.x, food.y, false);
      this.foodItems.delete(foodId);
      return true;
    }
    return false;
  }

  update(players) {
    const now = Date.now();
    const targetFoodCount = this.calculateTargetFoodCount(players.length);
    const currentFoodCount = this.foodItems.size;
    
    // Remove expired food
    for (const [id, food] of this.foodItems.entries()) {
      if (now - food.spawnTime > this.despawnTime) {
        this.removeFood(id);
      }
    }
    
    // Spawn new food if needed
    if (currentFoodCount < targetFoodCount) {
      const spawnCount = Math.min(
        5, // Max food to spawn per update
        targetFoodCount - currentFoodCount
      );
      return this.spawnFood(spawnCount, players);
    }
    
    return [];
  }

  getFoodNearPoint(x, y, radius) {
    const nearbyFood = [];
    const gridX = Math.floor(x / 100);
    const gridY = Math.floor(y / 100);
    
    // Check surrounding cells
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const checkX = gridX + i;
        const checkY = gridY + j;
        
        if (this.grid[checkX]?.[checkY] > 0) {
          for (const food of this.foodItems.values()) {
            const distance = Math.hypot(food.x - x, food.y - y);
            if (distance <= radius) {
              nearbyFood.push(food);
            }
          }
        }
      }
    }
    
    return nearbyFood;
  }

  getAllFood() {
    return Array.from(this.foodItems.values());
  }

  getFoodById(foodId) {
    return this.foodItems.get(foodId);
  }

  addEjectedMass(ejectedMass) {
    const food = {
      ...ejectedMass,
      type: 'ejected',
      spawnTime: Date.now()
    };
    this.foodItems.set(food.id, food);
    this.updateGridCell(food.x, food.y, true);
    return food;
  }
} 