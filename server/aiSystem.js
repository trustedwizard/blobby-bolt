import { PowerUpType, POWER_UP_COMBOS } from '../shared/types/powerups.js';

const AI_PERSONALITIES = {
  AGGRESSIVE: {
    name: 'aggressive',
    foodPriority: 0.3,
    chasePriority: 0.7,
    riskTolerance: 0.8,
    splitThreshold: 1.5  // Will split to chase when 1.5x bigger
  },
  DEFENSIVE: {
    name: 'defensive',
    foodPriority: 0.8,
    chasePriority: 0.2,
    riskTolerance: 0.2,
    splitThreshold: 2.0  // Will only split when 2x bigger
  },
  BALANCED: {
    name: 'balanced',
    foodPriority: 0.5,
    chasePriority: 0.5,
    riskTolerance: 0.5,
    splitThreshold: 1.7
  }
};

const AI_NAMES = [
  "Blobinator 🤖",
  "AI Blobster 🤖",
  "CyberSlime 🤖",
  "NeonGobble 🤖",
  "DataBlob 🤖",
  "BinaryBite 🤖",
  "QuantumNom 🤖",
  "CircuitBlob 🤖",
  "SynthBlob 🤖",
  "RoboMunch 🤖"
];

export class AISystem {
  constructor(worldSize, foodSystem) {
    this.worldSize = worldSize;
    this.foodSystem = foodSystem;
    this.aiBlobs = new Map();
    this.targetPositions = new Map();
    this.powerUpTargets = new Map();
    this.activePowerUps = new Map();
    this.lastDecisionTime = new Map();
    this.DECISION_INTERVAL = 100; // Make decisions every 100ms
    this.minTotalPlayers = 5;
    this.updateInterval = 100; // ms between AI updates
    this.lastUpdate = Date.now();
    this.gameStartTime = Date.now();
    this.lastLogTime = Date.now();
    this.LOG_INTERVAL = 5000;  // Only log every 5 seconds
    this.debugMode = process.env.NODE_ENV === 'development';
  }

  generateAIBlob() {
    const personality = this.getRandomPersonality();
    const name = this.getRandomName();
    const position = this.findSafeSpawnPosition();

    return {
      id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: position.x,
      y: position.y,
      radius: 30,
      color: Math.random() * 0xFFFFFF,
      name,
      emoji: '🤖',
      trail: [],
      score: 0,
      isAI: true,
      personality,
      lastDecision: Date.now(),
      lastSplit: 0,
      target: null
    };
  }

  getRandomPersonality() {
    const personalities = Object.values(AI_PERSONALITIES);
    return personalities[Math.floor(Math.random() * personalities.length)];
  }

  getRandomName() {
    return AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];
  }

  findSafeSpawnPosition() {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const x = Math.random() * this.worldSize;
      const y = Math.random() * this.worldSize;
      
      // Check if position is safe (away from other blobs)
      const isSafe = Array.from(this.aiBlobs.values()).every(blob => {
        const distance = Math.hypot(blob.x - x, blob.y - y);
        return distance > blob.radius * 5;
      });
      
      if (isSafe) return { x, y };
      attempts++;
    }
    
    // Fallback to random position
    return {
      x: Math.random() * this.worldSize,
      y: Math.random() * this.worldSize
    };
  }

  updateAICount(realPlayerCount) {
    const currentAICount = this.aiBlobs.size;
    const targetAICount = Math.max(0, this.minTotalPlayers - realPlayerCount);

    if (currentAICount < targetAICount) {
      // Add new AI blobs
      for (let i = 0; i < targetAICount - currentAICount; i++) {
        const aiBlob = this.generateAIBlob();
        this.aiBlobs.set(aiBlob.id, aiBlob);
      }
    } else if (currentAICount > targetAICount) {
      // Remove excess AI blobs
      const blobsToRemove = Array.from(this.aiBlobs.keys())
        .slice(0, currentAICount - targetAICount);
      blobsToRemove.forEach(id => this.aiBlobs.delete(id));
    }
  }

  update(realPlayers, food, powerUps) {
    const updates = [];
    const now = Date.now();

    for (const [id, aiBlob] of this.aiBlobs.entries()) {
      // Enforce strict decision interval
      if (now - (this.lastDecisionTime.get(id) || 0) < this.DECISION_INTERVAL) {
        continue;
      }
      this.lastDecisionTime.set(id, now);

      try {
        // Check and activate any available power-ups
        const activePowerUps = this.activePowerUps.get(aiBlob.id) || [];
        activePowerUps.forEach(powerUp => {
          if (this.shouldActivatePowerUp(aiBlob, powerUp.id)) {
            this.gameState.activatePowerUp(powerUp.id);
          }
        });

        // Check for combo possibilities
        this.checkForComboPossibilities(aiBlob);

        // Evaluate situation and make decisions
        const decision = this.evaluateSituation(aiBlob, realPlayers, food, powerUps);
        const updatedBlob = this.executeDecision(aiBlob, decision);
        updates.push(updatedBlob);
      } catch (error) {
        console.error(`Error updating AI ${id}:`, error);
        // Continue with next AI even if one fails
      }
    }

    return updates;
  }

  evaluateSituation(aiBlob, realPlayers, food, powerUps = []) {
    const threats = this.findThreats(aiBlob, realPlayers);
    const opportunities = this.findOpportunities(aiBlob, realPlayers, food);
    const availablePowerUps = this.evaluatePowerUps(aiBlob, Array.from(powerUps), threats);

    // Only log if in debug mode and enough time has passed
    if (this.debugMode && Date.now() - this.lastLogTime > this.LOG_INTERVAL) {
      console.log(`AI ${aiBlob.id} evaluation:`, {
        threats: threats.immediate.length + threats.nearby.length,
        opportunities: opportunities.prey.length,
        powerUps: availablePowerUps.highPriority.length + availablePowerUps.lowPriority.length
      });
      this.lastLogTime = Date.now();
    }

    // Prioritize actions based on situation
    if (threats.immediate.length > 0) {
      // Check for defensive power-ups first
      if (availablePowerUps.highPriority.length > 0) {
        const powerUpTarget = availablePowerUps.highPriority[0].powerUp;
        if (powerUpTarget && powerUpTarget.position) {
          return {
            type: 'collect_powerup',
            target: powerUpTarget
          };
        }
      }
      return this.planEvasiveAction(aiBlob, threats, availablePowerUps);
    }

    // Check for high-priority power-ups
    if (availablePowerUps.highPriority.length > 0) {
      const powerUpTarget = availablePowerUps.highPriority[0].powerUp;
      if (powerUpTarget && powerUpTarget.position) {
        return {
          type: 'collect_powerup',
          target: powerUpTarget
        };
      }
    }

    // Check for offensive opportunities with power-ups
    if (opportunities.prey.length > 0 && !threats.nearby.length) {
      // Look for offensive power-ups
      const offensivePowerUp = availablePowerUps.lowPriority.find(p => 
        p.powerUp.type === PowerUpType.GRAVITY_PULSE || 
        p.powerUp.type === PowerUpType.SPLIT_BOMB
      );
      
      if (offensivePowerUp && 
          offensivePowerUp.powerUp.position && 
          offensivePowerUp.distance < opportunities.prey[0].distance) {
        return {
          type: 'collect_powerup',
          target: offensivePowerUp.powerUp
        };
      }

      if (opportunities.prey[0]) {
        return {
          type: 'hunt',
          target: opportunities.prey[0]
        };
      }
    }

    // Check for farming opportunities with power-ups
    const magnetPowerUp = availablePowerUps.lowPriority.find(p => 
      p.powerUp.type === PowerUpType.BLOB_MAGNET
    );
    
    if (magnetPowerUp && 
        magnetPowerUp.powerUp.position && 
        this.nearbyFoodCount(aiBlob) > 3) {
      return {
        type: 'collect_powerup',
        target: magnetPowerUp.powerUp
      };
    }

    // Default to nearest food if available
    if (opportunities.food.length > 0) {
      return {
        type: 'farm',
        target: opportunities.food[0]
      };
    }

    // If no valid targets, return a random movement
    return {
      type: 'move',
      direction: {
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1
      }
    };
  }

  findThreats(aiBlob, realPlayers) {
    const immediate = [];
    const nearby = [];
    const IMMEDIATE_THREAT_RANGE = 100;
    const NEARBY_THREAT_RANGE = 300;

    for (const player of realPlayers) {
      if (player.id === aiBlob.id) continue;

      const distance = this.calculateDistance(aiBlob, player);
      const sizeDifference = player.radius / aiBlob.radius;

      if (sizeDifference > 1.1) {
        if (distance < IMMEDIATE_THREAT_RANGE) {
          immediate.push({ ...player, distance });
        } else if (distance < NEARBY_THREAT_RANGE) {
          nearby.push({ ...player, distance });
        }
      }
    }

    return {
      immediate,
      nearby
    };
  }

  findOpportunities(aiBlob, realPlayers, food) {
    const prey = [];
    const predators = [];
    const nearbyFood = [];

    // Check for prey and predators
    for (const player of realPlayers) {
      if (player.id === aiBlob.id) continue;

      const distance = this.calculateDistance(aiBlob, player);
      const sizeDifference = aiBlob.radius / player.radius;

      if (sizeDifference > 1.1) {
        prey.push({ ...player, distance });
      } else if (sizeDifference < 0.9) {
        predators.push({ ...player, distance });
      }
    }

    // Find nearby food
    for (const foodItem of food) {
      const distance = this.calculateDistance(aiBlob, foodItem);
      if (distance < aiBlob.radius * 5) {
        nearbyFood.push({ ...foodItem, distance });
      }
    }

    // Sort by distance
    prey.sort((a, b) => a.distance - b.distance);
    predators.sort((a, b) => a.distance - b.distance);
    nearbyFood.sort((a, b) => a.distance - b.distance);

    return {
      prey,
      predators,
      food: nearbyFood
    };
  }

  calculateDistance(entity1, entity2) {
    const dx = entity1.x - entity2.x;
    const dy = entity1.y - entity2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  evaluatePowerUps(aiBlob, powerUps, threats) {
    const highPriority = [];
    const lowPriority = [];

    // Ensure powerUps is iterable
    const powerUpArray = Array.isArray(powerUps) ? powerUps : Array.from(powerUps || []);

    for (const powerUp of powerUpArray) {
      const distance = this.calculateDistance(aiBlob, powerUp.position);
      const priority = this.evaluatePowerUpPriority(powerUp, aiBlob, threats);

      if (priority === 'high' || priority === 'critical') {
        highPriority.push({ powerUp, distance });
      } else {
        lowPriority.push({ powerUp, distance });
      }
    }

    // Sort by distance
    highPriority.sort((a, b) => a.distance - b.distance);
    lowPriority.sort((a, b) => a.distance - b.distance);

    return {
      highPriority,
      lowPriority
    };
  }

  planEvasiveAction(aiBlob, threats, availablePowerUps) {
    const nearestThreat = threats.immediate[0] || threats.nearby[0];
    if (!nearestThreat) return null;

    // Calculate escape direction (opposite of threat)
    const dx = aiBlob.x - nearestThreat.x;
    const dy = aiBlob.y - nearestThreat.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return {
      type: 'move',
      direction: {
        x: dx / distance,
        y: dy / distance
      }
    };
  }

  executeDecision(aiBlob, decision) {
    if (!decision) return aiBlob;

    switch (decision.type) {
      case 'collect_powerup':
        this.updateAIMovementTarget(aiBlob, decision.target?.position);
        return aiBlob;
      
      case 'hunt':
        this.updateAIMovementTarget(aiBlob, decision.target);
        return aiBlob;
      
      case 'escape':
        const targetPos = {
          x: aiBlob.x + decision.direction.x * 100,
          y: aiBlob.y + decision.direction.y * 100
        };
        this.updateAIMovementTarget(aiBlob, targetPos);
        return aiBlob;
      
      case 'farm':
        this.updateAIMovementTarget(aiBlob, decision.target);
        return aiBlob;
      
      default:
        return aiBlob;
    }
  }

  usePowerUp(aiBlob, powerUpId) {
    const activePowerUp = this.activePowerUps.get(aiBlob.id)?.find(p => p.id === powerUpId);
    if (!activePowerUp) return;

    switch (activePowerUp.type) {
      case PowerUpType.SHIELD:
        // Use when threats are very close
        const threats = this.findThreats(aiBlob, this.getVisiblePlayers(aiBlob));
        if (threats.immediate.length > 0) {
          return true;
        }
        break;

      case PowerUpType.SPEED_BOOST:
        // Use when chasing prey or escaping
        if (this.targetPositions.get(aiBlob.id)) {
          return true;
        }
        break;

      // ... handle other power-up types
    }

    return false;
  }

  // Helper methods
  getDistance(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  moveTowards(aiBlob, target) {
    // Add null check and validation
    if (!target || typeof target.x !== 'number' || typeof target.y !== 'number') {
      // Return random movement as fallback
      const randomAngle = Math.random() * Math.PI * 2;
      return {
        ...aiBlob,
        x: aiBlob.x + Math.cos(randomAngle) * this.getAISpeed(aiBlob),
        y: aiBlob.y + Math.sin(randomAngle) * this.getAISpeed(aiBlob)
      };
    }

    const dx = target.x - aiBlob.x;
    const dy = target.y - aiBlob.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      const speed = this.getAISpeed(aiBlob);
      return {
        ...aiBlob,
        x: aiBlob.x + (dx / distance) * speed,
        y: aiBlob.y + (dy / distance) * speed
      };
    }
    
    return aiBlob;
  }

  moveInDirection(aiBlob, direction) {
    const speed = this.getAISpeed(aiBlob);
    return {
      ...aiBlob,
      x: aiBlob.x + direction.x * speed,
      y: aiBlob.y + direction.y * speed
    };
  }

  getAISpeed(aiBlob) {
    let baseSpeed = 4;
    // Apply speed modifications from power-ups
    if (this.activePowerUps.get(aiBlob.id)?.some(p => p.type === PowerUpType.SPEED_BOOST)) {
      baseSpeed *= 1.5;
    }
    // Adjust speed based on size
    return baseSpeed * (1 - (aiBlob.radius / 200) * 0.5);
  }

  removeAI(id) {
    return this.aiBlobs.delete(id);
  }

  getAIBlobs() {
    return Array.from(this.aiBlobs.values());
  }

  respawnAI(deadAIId) {
    const newAI = this.generateAIBlob();
    this.aiBlobs.set(deadAIId, newAI);
    return newAI;
  }

  getNearbyPowerups(x, y, radius) {
    const nearbyPowerups = [];
    // Now that power-ups are implemented, we can get them from the game state
    for (const powerup of this.gameState.powerUps.values()) {
      const distance = Math.hypot(powerup.position.x - x, powerup.position.y - y);
      if (distance <= radius) {
        nearbyPowerups.push({
          ...powerup,
          distance
        });
      }
    }
    return nearbyPowerups;
  }

  evaluatePowerUpPriority(powerUp, aiBlob, threats) {
    const personality = aiBlob.personality || AI_PERSONALITIES.BALANCED;

    switch (powerUp.type) {
      case PowerUpType.SHIELD:
        return threats.immediate.length > 0 ? 'critical' :
               threats.nearby.length > 0 ? 'high' : 'low';
      
      case PowerUpType.SPEED_BOOST:
        if (personality.name === 'aggressive') {
          return threats.nearby.length > 0 ? 'critical' : 'high';
        }
        return threats.immediate.length > 0 ? 'critical' : 'medium';
      
      case PowerUpType.BLOB_MAGNET:
        return aiBlob.radius < 50 ? 'high' : 'low';
      
      case PowerUpType.GRAVITY_PULSE:
        if (personality.name === 'aggressive') {
          return threats.nearby.length > 1 ? 'critical' : 'high';
        }
        return 'medium';
      
      case PowerUpType.TELEPORT:
        return threats.immediate.length > 0 ? 'critical' : 'low';
      
      case PowerUpType.SPLIT_BOMB:
        if (personality.name === 'aggressive') {
          return threats.nearby.length > 2 ? 'critical' : 'high';
        }
        return threats.nearby.length > 0 ? 'medium' : 'low';
      
      default:
        return 'low';
    }
  }

  shouldActivatePowerUp(aiBlob, powerUpId) {
    const powerUp = this.activePowerUps.get(aiBlob.id)?.find(p => p.id === powerUpId);
    if (!powerUp) return false;

    const threats = this.findThreats(aiBlob, Array.from(this.gameState.players.values()));
    const personality = aiBlob.personality || AI_PERSONALITIES.BALANCED;

    switch (powerUp.type) {
      case PowerUpType.SHIELD:
        return threats.immediate.length > 0 || 
               (personality.riskTolerance < 0.3 && threats.nearby.length > 0);

      case PowerUpType.SPEED_BOOST:
        return threats.immediate.length > 0 || 
               (personality.name === 'aggressive' && threats.nearby.length > 0);

      case PowerUpType.BLOB_MAGNET:
        return aiBlob.radius < 50 || 
               (personality.foodPriority > 0.7 && this.nearbyFoodCount(aiBlob) > 3);

      case PowerUpType.GRAVITY_PULSE:
        return threats.nearby.length > 1 || 
               (personality.name === 'aggressive' && threats.nearby.length > 0);

      case PowerUpType.TELEPORT:
        return threats.immediate.length > 0 || 
               (personality.riskTolerance < 0.2 && threats.nearby.length > 0);

      case PowerUpType.SPLIT_BOMB:
        return threats.nearby.length > 2 || 
               (personality.name === 'aggressive' && threats.nearby.length > 1);

      default:
        return false;
    }
  }

  checkForComboPossibilities(aiBlob) {
    const activePowerUps = this.activePowerUps.get(aiBlob.id) || [];
    const activeTypes = new Set(activePowerUps.map(p => p.type));

    // Check each combo possibility
    Object.entries(POWER_UP_COMBOS).forEach(([comboName, combo]) => {
      const missingTypes = combo.types.filter(type => !activeTypes.has(type));
      if (missingTypes.length === 1) {
        // Prioritize collecting the missing power-up for this combo
        this.powerUpTargets.set(aiBlob.id, {
          type: missingTypes[0],
          priority: 'critical',
          comboName
        });
      }
    });
  }

  nearbyFoodCount(aiBlob) {
    const NEARBY_RADIUS = 200;
    let count = 0;
    
    for (const food of this.gameState.food.values()) {
      const dx = food.x - aiBlob.x;
      const dy = food.y - aiBlob.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < NEARBY_RADIUS) {
        count++;
      }
    }
    
    return count;
  }
} 