import { config } from './utils/config.js';
import { logger } from './utils/logger.js';
import { PowerUpType } from '../shared/types/powerups.js';

export class AISystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.worldSize = config.worldSize;
    this.updateInterval = 100; // ms
    this.lastUpdate = Date.now();
    this.splitCooldown = 10000; // 10 seconds
    this.ejectCooldown = 5000; // 5 seconds
    this.fleeRadius = 100; // Distance to start fleeing from larger blobs
    this.aggroRadius = 200; // Distance to start chasing smaller blobs
    this.foodRadius = 300; // Distance to start moving towards food

    logger.info('AISystem initialized', {
      worldSize: this.worldSize,
      updateInterval: this.updateInterval,
      splitCooldown: this.splitCooldown,
      fleeRadius: this.fleeRadius,
      aggroRadius: this.aggroRadius
    });
  }

  update() {
    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval) return;
    this.lastUpdate = now;

    for (const [id, player] of this.gameState.aiPlayers.entries()) {
      try {
        this.updateAIPlayer(player);
      } catch (error) {
        logger.error('Error updating AI player', {
          aiId: id,
          error: error.message,
          stack: error.stack
        });
      }
    }
  }

  updateAIPlayer(ai) {
    // Skip if AI was recently updated
    if (Date.now() - ai.lastUpdate < this.updateInterval) return;

    // Get nearby entities
    const nearbyPlayers = this.getNearbyPlayers(ai);
    const nearbyFood = this.getNearbyFood(ai);
    const nearbyPowerUps = this.getNearbyPowerUps(ai);

    // Determine threats and opportunities
    const threats = nearbyPlayers.filter(p => p.radius > ai.radius * 1.1);
    const prey = nearbyPlayers.filter(p => p.radius * 1.1 < ai.radius);

    logger.debug('AI player state', {
      aiId: ai.id,
      radius: ai.radius,
      nearbyThreats: threats.length,
      nearbyPrey: prey.length,
      nearbyFood: nearbyFood.length,
      nearbyPowerUps: nearbyPowerUps?.length || 0
    });

    // Decision making
    if (threats.length > 0) {
      this.handleThreats(ai, threats);
    } else if (nearbyPowerUps.length > 0) {
      this.handlePowerUps(ai, nearbyPowerUps);
    } else if (prey.length > 0) {
      this.handlePrey(ai, prey);
    } else if (nearbyFood.length > 0) {
      this.handleFood(ai, nearbyFood);
    } else {
      this.explore(ai);
    }

    // Consider splitting or ejecting mass
    this.considerSplitting(ai, prey);
    this.considerEjecting(ai, threats);
  }

  getNearbyPlayers(ai) {
    return Array.from(this.gameState.players.values())
      .filter(player => {
        if (player.id === ai.id) return false;
        if (player.teamId === ai.teamId) return false;
        const distance = this.getDistance(ai, player);
        return distance <= Math.max(this.fleeRadius, this.aggroRadius);
      });
  }

  getNearbyFood(ai) {
    return Array.from(this.gameState.food.values())
      .filter(food => {
        const distance = this.getDistance(ai, food);
        return distance <= this.foodRadius;
      });
  }

  getNearbyPowerUps(ai) {
    return Array.from(this.gameState.powerUps?.values() || [])
      .filter(powerUp => {
        const distance = this.getDistance(ai, powerUp);
        return distance <= this.aggroRadius;
      });
  }

  handleThreats(ai, threats) {
    // Find the most dangerous threat (largest and closest)
    const mainThreat = threats.reduce((prev, current) => {
      const prevDanger = prev.radius / this.getDistance(ai, prev);
      const currentDanger = current.radius / this.getDistance(ai, current);
      return currentDanger > prevDanger ? current : prev;
    });

    // Calculate escape vector (opposite direction from threat)
    const dx = ai.x - mainThreat.x;
    const dy = ai.y - mainThreat.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    logger.debug('AI fleeing from threat', {
      aiId: ai.id,
      threatId: mainThreat.id,
      distance,
      direction: { dx: dx/distance, dy: dy/distance }
    });

    // Move away from threat
    this.moveAI(ai, {
      x: ai.x + (dx / distance) * 2,
      y: ai.y + (dy / distance) * 2
    });
  }

  handlePowerUps(ai, powerUps) {
    // Find the closest power-up
    const closest = powerUps.reduce((prev, current) => {
      const prevDist = this.getDistance(ai, prev);
      const currentDist = this.getDistance(ai, current);
      return currentDist < prevDist ? current : prev;
    });

    logger.debug('AI pursuing power-up', {
      aiId: ai.id,
      powerUpId: closest.id,
      powerUpType: closest.type,
      distance: this.getDistance(ai, closest)
    });

    this.moveAI(ai, closest);
  }

  handlePrey(ai, prey) {
    // Find the most valuable prey (largest that we can still eat)
    const bestPrey = prey.reduce((prev, current) => {
      return current.radius > prev.radius ? current : prev;
    });

    logger.debug('AI hunting prey', {
      aiId: ai.id,
      preyId: bestPrey.id,
      preySize: bestPrey.radius,
      distance: this.getDistance(ai, bestPrey)
    });

    this.moveAI(ai, bestPrey);
  }

  handleFood(ai, food) {
    // Find the closest food
    const closest = food.reduce((prev, current) => {
      const prevDist = this.getDistance(ai, prev);
      const currentDist = this.getDistance(ai, current);
      return currentDist < prevDist ? current : prev;
    });

    logger.debug('AI collecting food', {
      aiId: ai.id,
      foodId: closest.id,
      distance: this.getDistance(ai, closest)
    });

    this.moveAI(ai, closest);
  }

  explore(ai) {
    // Random movement if no other targets
    if (!ai.exploreTarget || this.getDistance(ai, ai.exploreTarget) < 10) {
      ai.exploreTarget = {
        x: Math.random() * this.worldSize,
        y: Math.random() * this.worldSize
      };

      logger.debug('AI choosing new exploration target', {
        aiId: ai.id,
        target: ai.exploreTarget
      });
    }

    this.moveAI(ai, ai.exploreTarget);
  }

  considerSplitting(ai, prey) {
    const now = Date.now();
    if (now - ai.splitCooldown < this.splitCooldown) return;
    
    // Split if there's a good opportunity
    const worthySplitTarget = prey.find(p => {
      const distance = this.getDistance(ai, p);
      return distance < 150 && ai.radius > p.radius * 2;
    });

    if (worthySplitTarget) {
      ai.splitCooldown = now;
      logger.debug('AI performing split', {
        aiId: ai.id,
        targetId: worthySplitTarget.id,
        aiRadius: ai.radius,
        targetRadius: worthySplitTarget.radius
      });

      this.gameState.handleSplit(ai.id, {
        x: worthySplitTarget.x - ai.x,
        y: worthySplitTarget.y - ai.y
      });
    }
  }

  considerEjecting(ai, threats) {
    const now = Date.now();
    if (now - ai.ejectCooldown < this.ejectCooldown) return;

    // Eject mass if being chased and too big
    const dangerousThreats = threats.filter(t => {
      const distance = this.getDistance(ai, t);
      return distance < 200 && t.radius > ai.radius * 0.8;
    });

    if (dangerousThreats.length > 0 && ai.radius > 50) {
      ai.ejectCooldown = now;
      logger.debug('AI ejecting mass', {
        aiId: ai.id,
        threatCount: dangerousThreats.length,
        aiRadius: ai.radius
      });

      this.gameState.handleEject(ai.id, {
        x: dangerousThreats[0].x - ai.x,
        y: dangerousThreats[0].y - ai.y
      });
    }
  }

  moveAI(ai, target) {
    const dx = target.x - ai.x;
    const dy = target.y - ai.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      const speed = this.calculateSpeed(ai);
      const vx = (dx / distance) * speed;
      const vy = (dy / distance) * speed;

      // Update AI position with world bounds
      const newX = Math.max(0, Math.min(this.worldSize, ai.x + vx));
      const newY = Math.max(0, Math.min(this.worldSize, ai.y + vy));

      this.gameState.updatePlayerPosition(ai.id, {
        x: newX,
        y: newY,
        velocity: { x: vx, y: vy }
      });
    }
  }

  calculateSpeed(ai) {
    // Base speed inversely proportional to size
    const baseSpeed = Math.max(1, 3 - (ai.radius / 100));
    
    // Check for speed modifiers (power-ups, etc.)
    const hasSpeedBoost = ai.activePowerUps?.some(p => p.type === PowerUpType.SPEED_BOOST);
    
    return hasSpeedBoost ? baseSpeed * 1.5 : baseSpeed;
  }

  getDistance(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
} 