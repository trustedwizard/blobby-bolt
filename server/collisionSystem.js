export class CollisionSystem {
  constructor(worldSize) {
    this.worldSize = Math.max(1000, Math.min(10000, Number(worldSize)));
    this.cellSize = 100; // Size of each grid cell
    this.gridSize = Math.ceil(this.worldSize / this.cellSize);
    this.grid = this.initializeGrid();
    this.newBlobProtectionTime = 5000; // 5 seconds protection for new blobs
    this.minSizeRatio = 1.25; // Larger blob must be 25% bigger to eat
    this.bounceForce = 5; // Force applied when blobs bounce
    this.newBlobGrowthThreshold = 35; // Size needed before vulnerable
    this.collisionCooldown = 1000; // 1 second cooldown for collisions
    this.lastCollisions = new Map();
    this.newPlayerGrowthThreshold = 35; // Size needed before vulnerable
    this.newPlayerProtectionTime = 5000; // 5 seconds of protection
    this.obstacles = new Map(); // Add obstacle tracking
    this.protectedBlobs = new Set();
  }

  initializeGrid() {
    // Add safety checks for grid size
    const size = Math.max(1, Math.min(100, Math.ceil(this.worldSize / this.cellSize)));
    const grid = new Array(size);
    for (let i = 0; i < size; i++) {
      grid[i] = new Array(size);
      for (let j = 0; j < size; j++) {
        grid[i][j] = new Set();
      }
    }
    return grid;
  }

  updateGrid(entities) {
    // Clear grid by reinitializing each cell's Set
    for (let i = 0; i < this.grid.length; i++) {
      for (let j = 0; j < this.grid[i].length; j++) {
        this.grid[i][j] = new Set();
      }
    }

    // Add entities to grid cells
    entities.forEach(entity => {
      const cells = this.getCellsForEntity(entity);
      cells.forEach(([x, y]) => {
        if (this.grid[x] && this.grid[x][y]) {
          this.grid[x][y].add(entity);
        }
      });
    });
  }

  getCellsForEntity(entity) {
    const cells = new Set();
    const radius = entity.radius || entity.size || 0;
    
    // Get grid coordinates for entity bounds
    const minX = Math.max(0, Math.floor((entity.x - radius) / this.cellSize));
    const maxX = Math.min(this.grid.length - 1, Math.floor((entity.x + radius) / this.cellSize));
    const minY = Math.max(0, Math.floor((entity.y - radius) / this.cellSize));
    const maxY = Math.min(this.grid[0].length - 1, Math.floor((entity.y + radius) / this.cellSize));

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        cells.add([x, y]);
      }
    }
    return cells;
  }

  checkCollisions(entities, foodSystem) {
    const collisions = [];
    this.updateGrid(entities);

    entities.forEach(entity => {
      if (!entity.isProtected) {
        // Get nearby entities from grid
        const nearbyCells = this.getCellsForEntity(entity);
        const nearbyEntities = new Set();
        
        nearbyCells.forEach(([x, y]) => {
          if (this.grid[x] && this.grid[x][y]) {
            this.grid[x][y].forEach(other => {
              if (other !== entity) {
                nearbyEntities.add(other);
              }
            });
          }
        });

        // Check collisions with nearby entities
        nearbyEntities.forEach(other => {
          if (this.checkCollision(entity, other)) {
            collisions.push([entity, other]);
          }
        });

        // Check food collisions
        const nearbyFood = foodSystem.getFoodNearPoint(entity.x, entity.y, entity.radius);
        nearbyFood.forEach(food => {
          if (this.checkFoodCollision(entity, food)) {
            collisions.push([entity, food]);
          }
        });
      }
    });

    return collisions;
  }

  checkCollision(entity1, entity2) {
    const now = Date.now();
    const collisionKey = `${entity1.id}-${entity2.id}`;
    const lastCollision = this.lastCollisions.get(collisionKey);
    
    if (lastCollision && now - lastCollision < this.collisionCooldown) {
      return false;
    }

    // Skip if either entity is protected
    if (entity1.isProtected || entity2.isProtected) return false;

    // Add growth level check
    if (entity1.radius < this.newBlobGrowthThreshold || 
        entity2.radius < this.newBlobGrowthThreshold) {
      return false;
    }

    // Add split blob handling
    if (entity1.parentId || entity2.parentId) {
      // Don't collide with own split pieces
      if (entity1.parentId === entity2.id || entity2.parentId === entity1.id ||
          entity1.id === entity2.parentId || entity2.id === entity1.parentId) {
        return false;
      }
      // Allow merging if enough time has passed
      if (entity1.canMerge && entity2.canMerge && 
          entity1.parentId === entity2.parentId) {
        return {
          type: 'merge',
          entities: [entity1, entity2]
        };
      }
    }

    // Add new player protection
    if ((entity1.radius < this.newBlobGrowthThreshold && 
         Date.now() - entity1.spawnTime < this.newPlayerProtectionTime) ||
        (entity2.radius < this.newBlobGrowthThreshold && 
         Date.now() - entity2.spawnTime < this.newPlayerProtectionTime)) {
      return false;
    }

    const distance = Math.hypot(entity2.x - entity1.x, entity2.y - entity1.y);
    const sumRadii = entity1.radius + entity2.radius;

    if (distance < sumRadii) {
      // Check size ratio for blob-blob collisions
      if (entity1.type === 'blob' && entity2.type === 'blob') {
        const ratio = entity1.radius / entity2.radius;
        if (ratio > this.minSizeRatio) {
          return true;
        } else if (ratio < 1 / this.minSizeRatio) {
          return false;
        } else {
          // Similar sizes - bounce
          this.handleBounce(entity1, entity2);
          return false;
        }
      }
      return true;
    }
    return false;
  }

  checkFoodCollision(blob, food) {
    const distance = Math.hypot(food.x - blob.x, food.y - blob.y);
    return distance < blob.radius + food.size;
  }

  handleBounce(entity1, entity2) {
    const angle = Math.atan2(entity2.y - entity1.y, entity2.x - entity1.x);
    const speed = 5;

    // Apply bounce velocities
    entity1.velocity = {
      x: -Math.cos(angle) * speed,
      y: -Math.sin(angle) * speed
    };

    entity2.velocity = {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed
    };
  }

  resolveCollisions(collisions, gameState) {
    collisions.forEach(([entity1, entity2]) => {
      if (entity2.type === 'food') {
        this.handleFoodCollision(entity1, entity2, gameState);
      } else {
        this.handleBlobCollision(entity1, entity2, gameState);
      }
    });
  }

  handleFoodCollision(blob, food, gameState) {
    // Remove food
    gameState.foodSystem.removeFood(food.id);

    // Update blob size and score
    const growthMultiplier = food.type === 'power' ? 1.5 : 1.0;
    blob.radius = Math.min(200, blob.radius * (1.005 * growthMultiplier));
    blob.score += food.type === 'power' ? 2 : 1;

    // Emit updates
    gameState.io.emit('food:removed', food.id);
    gameState.io.emit('player:updated', blob);
  }

  handleBlobCollision(blob1, blob2, gameState) {
    // Add collision animation event
    gameState.io.emit('collision:effect', {
      type: 'absorption',
      position: { x: blob2.x, y: blob2.y },
      color: blob2.color,
      size: blob2.radius,
      victimName: blob2.name,
      eaterName: blob1.name,
      effectDuration: 500
    });

    // Add growth animation
    gameState.io.emit('blob:grow', {
      id: blob1.id,
      fromSize: blob1.radius,
      toSize: Math.sqrt(blob1.radius * blob1.radius + blob2.radius * blob2.radius),
      duration: 300
    });

    // Add sound effect
    gameState.io.emit('sound:play', {
      type: 'absorption',
      volume: Math.min(1, blob2.radius / 100)
    });
  }

  checkObstacleCollisions(blob) {
    for (const obstacle of this.obstacles.values()) {
      if (this.checkObstacleCollision(blob, obstacle)) {
        return this.handleObstacleBounce(blob, obstacle);
      }
    }
    return blob;
  }

  checkObstacleCollision(blob, obstacle) {
    const distance = Math.hypot(obstacle.x - blob.x, obstacle.y - blob.y);
    return distance < blob.radius + obstacle.radius;
  }

  handleObstacleBounce(blob, obstacle) {
    const angle = Math.atan2(blob.y - obstacle.y, blob.x - obstacle.x);
    const bounceForce = this.bounceForce;
    
    return {
      ...blob,
      x: blob.x + Math.cos(angle) * bounceForce,
      y: blob.y + Math.sin(angle) * bounceForce,
      velocity: {
        x: Math.cos(angle) * bounceForce,
        y: Math.sin(angle) * bounceForce
      }
    };
  }

  checkProtectionStatus(blob) {
    if (blob.radius < this.newBlobGrowthThreshold) {
      this.protectedBlobs.add(blob.id);
      // Add visual feedback
      gameState.io.emit('blob:effect', {
        id: blob.id,
        type: 'shield',
        duration: 500
      });
      return true;
    } else {
      this.protectedBlobs.delete(blob.id);
      return false;
    }
  }

  addObstacle(obstacle) {
    this.obstacles.set(obstacle.id, obstacle);
    // Update grid with obstacle
    this.updateGridWithObstacle(obstacle);
  }

  updateGridWithObstacle(obstacle) {
    // Clear grid
    this.grid.forEach(cell => cell.clear());

    // Add obstacle to grid cells
    const cells = this.getCellsForEntity(obstacle);
    cells.forEach(([x, y]) => {
      if (this.grid[x] && this.grid[x][y]) {
        this.grid[x][y].add(obstacle);
      }
    });
  }
} 