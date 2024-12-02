import { config } from './utils/config.js';
import { logger } from './utils/logger.js';
import { PowerUpType } from '../shared/types/powerups.js';

export class AISystem {
  constructor(worldSize) {
    this.worldSize = worldSize;
    this.aggroRadius = 200;
    this.fleeRadius = 100;
    this.updateInterval = 100;
    this.splitCooldown = 10000;
    
    logger.info('AISystem initialized', {
      worldSize: this.worldSize,
      aggroRadius: this.aggroRadius,
      fleeRadius: this.fleeRadius,
      updateInterval: this.updateInterval,
      splitCooldown: this.splitCooldown
    });
  }

  update(deltaTime, gameState, foodSystem) {
    if (!gameState || !gameState.players) return;

    const players = Array.from(gameState.players.values());
    const aiPlayers = players.filter(p => p.isAI);
    const realPlayers = players.filter(p => !p.isAI);
    const food = foodSystem ? Array.from(foodSystem.getAllFood()) : [];

    for (const ai of aiPlayers) {
      this.updateAIBehavior(ai, realPlayers, food);
    }
  }

  updateAIBehavior(ai, players, food) {
    // Find nearest target (food or smaller player)
    const target = this.findNearestTarget(ai, players, food);
    if (!target) return;

    // Calculate direction to target
    const dx = target.x - ai.x;
    const dy = target.y - ai.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Update AI velocity
    if (distance > 0) {
      const speed = 2;
      ai.velocity = {
        x: (dx / distance) * speed,
        y: (dy / distance) * speed
      };
    }
  }

  findNearestTarget(ai, players, food) {
    let nearestTarget = null;
    let minDistance = Infinity;

    // Check food
    for (const f of food) {
      const distance = this.getDistance(ai, f);
      if (distance < minDistance) {
        minDistance = distance;
        nearestTarget = f;
      }
    }

    // Check smaller players
    for (const player of players) {
      if (player.id !== ai.id && player.radius * 1.1 < ai.radius) {
        const distance = this.getDistance(ai, player);
        if (distance < minDistance) {
          minDistance = distance;
          nearestTarget = player;
        }
      }
    }

    return nearestTarget;
  }

  getDistance(entity1, entity2) {
    const dx = entity1.x - entity2.x;
    const dy = entity1.y - entity2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  reset() {
    // Reset any AI-specific state
    logger.info('AISystem reset');
  }
} 