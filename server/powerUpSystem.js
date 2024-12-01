import { PowerUpType, POWER_UP_COMBOS } from '../shared/types/powerups.js';

class PowerUpSystem {
  constructor(io, gameState) {
    this.io = io;
    this.gameState = gameState;
    this.powerUps = new Map();
    this.maxPowerUps = 10;
    this.spawnInterval = 5000;
    this.despawnTime = 30000;
    this.minDistanceFromPlayers = 100;

    this.start();
  }

  start() {
    setInterval(() => {
      this.spawnPowerUps();
      this.cleanupExpiredPowerUps();
    }, this.spawnInterval);
  }

  spawnPowerUps() {
    if (this.powerUps.size >= this.maxPowerUps) return;

    const playerPositions = Array.from(this.gameState.players.values())
      .map(player => ({ x: player.x, y: player.y }));

    const numToSpawn = this.maxPowerUps - this.powerUps.size;
    
    for (let i = 0; i < numToSpawn; i++) {
      const powerUp = this.generatePowerUp(playerPositions);
      this.powerUps.set(powerUp.id, powerUp);
      this.io.emit('powerup:spawn', powerUp);
    }
  }

  generatePowerUp(playerPositions) {
    const types = Object.values(PowerUpType);
    const type = types[Math.floor(Math.random() * types.length)];
    let position;

    do {
      position = {
        x: Math.random() * this.gameState.worldSize,
        y: Math.random() * this.gameState.worldSize
      };
    } while (this.isTooCloseToPlayers(position, playerPositions));

    return {
      id: `powerup-${Date.now()}-${Math.random()}`,
      type,
      position,
      spawnTime: Date.now(),
      duration: this.getDuration(type),
      isInstant: this.isInstantPowerUp(type)
    };
  }

  isTooCloseToPlayers(position, playerPositions) {
    return playerPositions.some(playerPos => {
      const distance = Math.sqrt(
        Math.pow(position.x - playerPos.x, 2) + 
        Math.pow(position.y - playerPos.y, 2)
      );
      return distance < this.minDistanceFromPlayers;
    });
  }

  getDuration(type) {
    const durations = {
      [PowerUpType.SPEED_BOOST]: 10000,
      [PowerUpType.SHIELD]: 8000,
      [PowerUpType.BLOB_MAGNET]: 15000,
      [PowerUpType.GRAVITY_PULSE]: 0,
      [PowerUpType.TELEPORT]: 0,
      [PowerUpType.SPLIT_BOMB]: 0
    };
    return durations[type];
  }

  isInstantPowerUp(type) {
    const instantTypes = [
      PowerUpType.GRAVITY_PULSE,
      PowerUpType.TELEPORT,
      PowerUpType.SPLIT_BOMB
    ];
    return instantTypes.includes(type);
  }

  cleanupExpiredPowerUps() {
    const now = Date.now();
    for (const [id, powerUp] of this.powerUps.entries()) {
      if (now - powerUp.spawnTime > this.despawnTime) {
        this.powerUps.delete(id);
        this.io.emit('powerup:despawn', id);
      }
    }
  }

  handleCollection(powerUpId, playerId) {
    const powerUp = this.powerUps.get(powerUpId);
    if (!powerUp) return null;

    this.powerUps.delete(powerUpId);
    this.io.emit('powerup:collected', { powerUpId, playerId });

    return {
      ...powerUp,
      playerId,
      expiresAt: Date.now() + powerUp.duration
    };
  }

  applyPowerUpEffect(powerUp, player) {
    switch (powerUp.type) {
      case PowerUpType.SPEED_BOOST:
        this.applySpeedBoost(player, powerUp.duration);
        break;

      case PowerUpType.SHIELD:
        this.applyShield(player, powerUp.duration);
        break;

      case PowerUpType.BLOB_MAGNET:
        this.applyBlobMagnet(player, powerUp.duration);
        break;

      case PowerUpType.GRAVITY_PULSE:
        this.applyGravityPulse(player);
        break;

      case PowerUpType.TELEPORT:
        this.applyTeleport(player);
        break;

      case PowerUpType.SPLIT_BOMB:
        this.applySplitBomb(player);
        break;
    }

    this.io.emit('powerup:effect', {
      type: powerUp.type,
      playerId: player.id
    });
  }

  applySpeedBoost(player, duration) {
    const SPEED_MULTIPLIER = 1.5;
    
    player.speedMultiplier = SPEED_MULTIPLIER;
    player.effects = player.effects || {};
    player.effects.speedBoost = {
      endTime: Date.now() + duration
    };

    setTimeout(() => {
      if (player.effects?.speedBoost) {
        delete player.effects.speedBoost;
        player.speedMultiplier = 1;
        this.io.emit('player:updated', player);
      }
    }, duration);

    this.io.emit('player:updated', player);
  }

  applyShield(player, duration) {
    player.isShielded = true;
    player.effects = player.effects || {};
    player.effects.shield = {
      endTime: Date.now() + duration
    };

    setTimeout(() => {
      if (player.effects?.shield) {
        delete player.effects.shield;
        player.isShielded = false;
        this.io.emit('player:updated', player);
      }
    }, duration);

    this.io.emit('player:updated', player);
  }

  applyBlobMagnet(player, duration) {
    const MAGNET_RADIUS = 200;
    const PULL_FORCE = 4;

    player.hasMagnet = true;
    player.effects = player.effects || {};
    player.effects.magnet = {
      endTime: Date.now() + duration,
      radius: MAGNET_RADIUS,
      force: PULL_FORCE
    };

    // Start magnet effect interval
    const magnetInterval = setInterval(() => {
      if (!player.effects?.magnet || Date.now() > player.effects.magnet.endTime) {
        clearInterval(magnetInterval);
        delete player.effects.magnet;
        player.hasMagnet = false;
        this.io.emit('player:updated', player);
        return;
      }

      // Apply magnet effect to nearby food
      for (const [foodId, food] of this.gameState.food) {
        const dx = player.x - food.x;
        const dy = player.y - food.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < MAGNET_RADIUS) {
          const force = (MAGNET_RADIUS - distance) / MAGNET_RADIUS * PULL_FORCE;
          food.x += (dx / distance) * force;
          food.y += (dy / distance) * force;
          this.io.emit('food:updated', food);
        }
      }
    }, 100); // Update every 100ms

    this.io.emit('player:updated', player);
  }

  applyGravityPulse(player) {
    const PULSE_RADIUS = 300;
    const PULL_FORCE = 8;
    const PULSE_DURATION = 1000; // 1 second pulse

    const startTime = Date.now();
    const pulseInterval = setInterval(() => {
      if (Date.now() - startTime > PULSE_DURATION) {
        clearInterval(pulseInterval);
        return;
      }

      // Apply gravity to nearby blobs
      for (const [, otherPlayer] of this.gameState.players) {
        if (otherPlayer.id === player.id) continue;
        if (otherPlayer.isShielded) continue;

        const dx = player.x - otherPlayer.x;
        const dy = player.y - otherPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < PULSE_RADIUS) {
          const force = (PULSE_RADIUS - distance) / PULSE_RADIUS * PULL_FORCE;
          otherPlayer.x += (dx / distance) * force;
          otherPlayer.y += (dy / distance) * force;
          this.io.emit('player:updated', otherPlayer);
        }
      }
    }, 50); // Update every 50ms
  }

  applyTeleport(player) {
    const SAFE_MARGIN = 200;
    let newPosition;
    let isSafe;

    // Try to find a safe position
    do {
      newPosition = {
        x: SAFE_MARGIN + Math.random() * (this.gameState.worldSize - 2 * SAFE_MARGIN),
        y: SAFE_MARGIN + Math.random() * (this.gameState.worldSize - 2 * SAFE_MARGIN)
      };

      isSafe = true;
      // Check distance from other players
      for (const [, otherPlayer] of this.gameState.players) {
        if (otherPlayer.id === player.id) continue;
        const dx = newPosition.x - otherPlayer.x;
        const dy = newPosition.y - otherPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < SAFE_MARGIN) {
          isSafe = false;
          break;
        }
      }
    } while (!isSafe);

    // Apply teleport
    player.x = newPosition.x;
    player.y = newPosition.y;
    
    // Add teleport animation state
    player.effects = player.effects || {};
    player.effects.teleport = {
      startTime: Date.now(),
      duration: 500 // 500ms animation
    };

    this.io.emit('player:updated', player);
  }

  applySplitBomb(player) {
    const BOMB_RADIUS = 250;
    const MIN_SPLIT_SIZE = 50;

    for (const [, otherPlayer] of this.gameState.players) {
      if (otherPlayer.id === player.id) continue;
      if (otherPlayer.isShielded) continue;

      const dx = otherPlayer.x - player.x;
      const dy = otherPlayer.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < BOMB_RADIUS && otherPlayer.radius >= MIN_SPLIT_SIZE) {
        // Trigger split for the affected player
        this.gameState.splitPlayer(otherPlayer.id, {
          forcedSplit: true,
          splitDirection: {
            x: dx / distance,
            y: dy / distance
          }
        });
      }
    }
  }
}

export default PowerUpSystem; 