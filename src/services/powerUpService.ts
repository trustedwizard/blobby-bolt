import { PowerUp, PowerUpType, ActivePowerUp } from '../types/powerups';
import { v4 as uuidv4 } from 'uuid';

const POWER_UP_CONFIG = {
  MAX_ACTIVE_POWERUPS: 10,
  SPAWN_INTERVAL: 5000, // 5 seconds
  DESPAWN_TIME: 30000, // 30 seconds
  MIN_DISTANCE_FROM_PLAYERS: 100,
  DURATIONS: {
    [PowerUpType.SPEED_BOOST]: 10000,
    [PowerUpType.SHIELD]: 8000,
    [PowerUpType.BLOB_MAGNET]: 15000,
    [PowerUpType.GRAVITY_PULSE]: 0, // instant
    [PowerUpType.TELEPORT]: 0, // instant
    [PowerUpType.SPLIT_BOMB]: 0, // instant
  },
  IS_INSTANT: {
    [PowerUpType.SPEED_BOOST]: false,
    [PowerUpType.SHIELD]: false,
    [PowerUpType.BLOB_MAGNET]: false,
    [PowerUpType.GRAVITY_PULSE]: true,
    [PowerUpType.TELEPORT]: true,
    [PowerUpType.SPLIT_BOMB]: true,
  }
};

class PowerUpService {
  private activePowerUps: Map<string, PowerUp> = new Map();
  private playerPowerUps: Map<string, ActivePowerUp[]> = new Map();

  generatePowerUp(mapWidth: number, mapHeight: number, playerPositions: Array<{x: number, y: number}>): PowerUp {
    const type = this.getRandomPowerUpType();
    let position;
    
    do {
      position = {
        x: Math.random() * mapWidth,
        y: Math.random() * mapHeight
      };
    } while (this.isTooCloseToPlayers(position, playerPositions));

    return {
      id: uuidv4(),
      type,
      position,
      color: 0x00ffff,
      duration: POWER_UP_CONFIG.DURATIONS[type],
      expiresAt: Date.now() + POWER_UP_CONFIG.DURATIONS[type],
      spawnTime: Date.now(),
      isInstant: POWER_UP_CONFIG.IS_INSTANT[type]
    };
  }

  private isTooCloseToPlayers(position: {x: number, y: number}, playerPositions: Array<{x: number, y: number}>): boolean {
    return playerPositions.some(playerPos => {
      const distance = Math.sqrt(
        Math.pow(position.x - playerPos.x, 2) + 
        Math.pow(position.y - playerPos.y, 2)
      );
      return distance < POWER_UP_CONFIG.MIN_DISTANCE_FROM_PLAYERS;
    });
  }

  private getRandomPowerUpType(): PowerUpType {
    const types = Object.values(PowerUpType);
    return types[Math.floor(Math.random() * types.length)];
  }

  collectPowerUp(powerUpId: string, playerId: string): ActivePowerUp | null {
    const powerUp = this.activePowerUps.get(powerUpId);
    if (!powerUp) return null;

    this.activePowerUps.delete(powerUpId);

    if (powerUp.isInstant) {
      return {
        ...powerUp,
        playerId,
        expiresAt: Date.now()
      };
    }

    const playerPowerUps = this.playerPowerUps.get(playerId) || [];
    if (playerPowerUps.length >= 2) return null;

    const activePowerUp: ActivePowerUp = {
      ...powerUp,
      playerId,
      expiresAt: Date.now() + powerUp.duration
    };

    this.playerPowerUps.set(playerId, [...playerPowerUps, activePowerUp]);
    return activePowerUp;
  }

  cleanupExpiredPowerUps() {
    const now = Date.now();
    
    // Clean up spawned power-ups
    for (const [id, powerUp] of this.activePowerUps.entries()) {
      if (now - powerUp.spawnTime > POWER_UP_CONFIG.DESPAWN_TIME) {
        this.activePowerUps.delete(id);
      }
    }

    // Clean up player power-ups
    for (const [playerId, powerUps] of this.playerPowerUps.entries()) {
      const activePowerUps = powerUps.filter(p => p.expiresAt > now);
      if (activePowerUps.length === 0) {
        this.playerPowerUps.delete(playerId);
      } else {
        this.playerPowerUps.set(playerId, activePowerUps);
      }
    }
  }
}

export const powerUpService = new PowerUpService(); 