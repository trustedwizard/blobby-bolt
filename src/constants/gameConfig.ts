import { GameConfig } from '../types/game';
import { DEFAULT_POWER_UP_CONFIG } from '../types/powerups';
import { DEFAULT_EFFECT_CONFIG } from '../types/effects';

// Core game configuration
export const GAME_CONFIG: GameConfig = {
  worldSize: 4000, // Synchronized with server config
  maxPlayers: 50,
  minPlayers: 2,
  startDelay: 5000,
  roundTime: 600000, // 10 minutes
  spawnProtectionTime: 5000,
  respawnDelay: 3000,
  initialRadius: 25,
  maxBlobSize: 500,
  minSplitSize: 35,
  splitForce: 750,
  ejectForce: 500,
  friction: 0.02,
  tickRate: 60,
  mapBounds: {
    width: 4000, // Synchronized with worldSize
    height: 4000
  }
};

// Physics configuration
export const PHYSICS_CONFIG = {
  baseSpeed: 5,
  massToSpeedRatio: 0.005,
  minSpeed: 2,
  maxSpeed: 15,
  boostMultiplier: 1.5,
  splitCooldown: 10000,
  mergeCooldown: 15000,
  ejectionCooldown: 500,
  collisionForce: 5,
  bounceReduction: 0.8,
  wallBounceForce: 10,
  minBlobSize: 30,
  startingMass: 100
};

// Scoring configuration
export const SCORING_CONFIG = {
  basePoints: 10,
  killPoints: 100,
  foodPoints: 1,
  comboMultiplier: 1.5,
  maxCombo: 10,
  comboTimeout: 5000,
  leaderboardSize: 10,
  achievementPoints: 50
};

// Food configuration (shared with server)
export const FOOD_CONFIG = {
  types: {
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
  },
  spawnRate: 50, // Food items per second
  maxFood: 1000
};

// Obstacle configuration (shared with server)
export const OBSTACLE_CONFIG = {
  types: {
    WALL: {
      name: 'Wall',
      solid: true,
      destructible: false,
      damage: 0,
      bounceForce: 1,
      color: 0x808080,
      defaultWidth: 100,
      defaultHeight: 20
    },
    SPIKE: {
      name: 'Spike',
      solid: true,
      destructible: false,
      damage: 25,
      bounceForce: 0.5,
      color: 0xFF0000,
      defaultWidth: 30,
      defaultHeight: 30
    },
    BREAKABLE: {
      name: 'Breakable',
      solid: true,
      destructible: true,
      health: 100,
      damage: 0,
      bounceForce: 0.8,
      color: 0xA0522D,
      defaultWidth: 50,
      defaultHeight: 50
    },
    SLIME: {
      name: 'Slime',
      solid: false,
      destructible: false,
      damage: 0,
      speedMultiplier: 0.5,
      color: 0x00FF00,
      defaultWidth: 80,
      defaultHeight: 80
    },
    TELEPORTER: {
      name: 'Teleporter',
      solid: false,
      destructible: false,
      damage: 0,
      cooldown: 5000,
      color: 0x9400D3,
      defaultWidth: 40,
      defaultHeight: 40
    }
  },
  maxObstacles: 50,
  minDistanceFromSpawn: 500
};

// Team configuration
export const TEAM_CONFIG = {
  maxTeamSize: 5,
  minTeamSize: 2,
  teamColors: [
    0xFF0000, // Red
    0x0000FF, // Blue
    0x00FF00, // Green
    0xFFFF00, // Yellow
    0xFF00FF  // Purple
  ],
  friendlyFireDamage: 0,
  teamScoreMultiplier: 1.2,
  teamPowerUpBonus: 1.5
};

// Game modes configuration
export const GAME_MODES = {
  ffa: {
    name: 'Free For All',
    description: 'Every player for themselves',
    maxPlayers: 50,
    respawnEnabled: true
  },
  teams: {
    name: 'Team Battle',
    description: 'Work together to dominate',
    maxPlayers: 40,
    teamSize: 4,
    respawnEnabled: true
  },
  'battle-royale': {
    name: 'Battle Royale',
    description: 'Last blob standing',
    maxPlayers: 30,
    respawnEnabled: false,
    shrinkInterval: 60000
  },
  capture: {
    name: 'Capture the Flag',
    description: 'Capture and defend objectives',
    maxPlayers: 30,
    teamSize: 3,
    capturePoints: 5
  },
  survival: {
    name: 'Survival',
    description: 'Survive against increasing challenges',
    maxPlayers: 20,
    waveDuration: 60000,
    difficultyIncrease: 1.2
  }
};

// Combine all configurations
export const CONFIG = {
  game: GAME_CONFIG,
  physics: PHYSICS_CONFIG,
  scoring: SCORING_CONFIG,
  powerUps: DEFAULT_POWER_UP_CONFIG,
  effects: DEFAULT_EFFECT_CONFIG,
  teams: TEAM_CONFIG,
  gameModes: GAME_MODES,
  food: FOOD_CONFIG,
  obstacles: OBSTACLE_CONFIG
}; 