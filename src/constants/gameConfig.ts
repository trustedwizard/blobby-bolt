import { GameConfig } from '../types/game';
import { DEFAULT_POWER_UP_CONFIG } from '../types/powerups';
import { DEFAULT_EFFECT_CONFIG } from '../types/effects';

// Core game configuration
export const GAME_CONFIG: GameConfig = {
  worldSize: 5000,
  maxPlayers: 50,
  minPlayers: 2,
  startDelay: 5000,
  roundTime: 600000, // 10 minutes
  spawnProtectionTime: 5000,
  respawnDelay: 3000,
  maxBlobSize: 500,
  minSplitSize: 35,
  splitForce: 750,
  ejectForce: 500,
  friction: 0.02,
  tickRate: 60,
  mapBounds: {
    width: 5000,
    height: 5000
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
  startingMass: 100,
  maxBlobSize: 500,
  minSplitSize: 35,
  splitForce: 750,
  ejectForce: 500,
  friction: 0.02
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
  gameModes: GAME_MODES
}; 