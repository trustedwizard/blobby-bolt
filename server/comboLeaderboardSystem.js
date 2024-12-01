import { POWER_UP_COMBOS } from '../shared/types/powerups.js';

class ComboLeaderboardSystem {
  constructor(io) {
    this.io = io;
    this.leaderboards = new Map();
    this.playerStats = new Map();
    
    // Initialize leaderboards for each combo type
    Object.keys(POWER_UP_COMBOS).forEach(comboType => {
      this.leaderboards.set(comboType, []);
    });
  }

  startPeriodicUpdates() {
    setInterval(() => {
      this.broadcastLeaderboards();
    }, this.updateInterval);
  }

  trackComboActivation(playerId, playerName, comboType, success = true) {
    // Get or create player stats
    let playerStats = this.playerStats.get(playerId) || {
      id: playerId,
      name: playerName,
      combos: new Map()
    };

    // Get or create combo stats for this player
    let comboStats = playerStats.combos.get(comboType) || {
      activations: 0,
      successfulHits: 0,
      totalDamage: 0,
      lastActivation: 0
    };

    // Update stats
    comboStats.activations++;
    if (success) {
      comboStats.successfulHits++;
    }
    comboStats.lastActivation = Date.now();

    // Save updated stats
    playerStats.combos.set(comboType, comboStats);
    this.playerStats.set(playerId, playerStats);

    // Update leaderboard
    this.updateLeaderboard(comboType);
  }

  updateLeaderboard(comboType) {
    let leaderboard = [];

    // Convert player stats to leaderboard entries
    for (const [playerId, playerStats] of this.playerStats.entries()) {
      const comboStats = playerStats.combos.get(comboType);
      if (comboStats) {
        leaderboard.push({
          playerId,
          playerName: playerStats.name,
          activations: comboStats.activations,
          successRate: comboStats.successfulHits / comboStats.activations,
          lastActivation: comboStats.lastActivation
        });
      }
    }

    // Sort leaderboard
    leaderboard.sort((a, b) => {
      // First by activations
      if (b.activations !== a.activations) {
        return b.activations - a.activations;
      }
      // Then by success rate
      if (b.successRate !== a.successRate) {
        return b.successRate - a.successRate;
      }
      // Finally by most recent
      return b.lastActivation - a.lastActivation;
    });

    // Keep top 100 entries
    leaderboard = leaderboard.slice(0, 100);
    this.leaderboards.set(comboType, leaderboard);

    // Emit update for this combo type
    this.io.emit('combo:leaderboard:update', {
      comboType,
      leaderboard: leaderboard.slice(0, 10) // Send only top 10 to clients
    });
  }

  broadcastLeaderboards() {
    for (const [comboType, leaderboard] of this.leaderboards.entries()) {
      this.io.emit('combo:leaderboard:update', {
        comboType,
        leaderboard: leaderboard.slice(0, 10)
      });
    }
  }

  getPlayerStats(playerId) {
    return this.playerStats.get(playerId);
  }

  getLeaderboard(comboType, limit = 10) {
    const leaderboard = this.leaderboards.get(comboType) || [];
    return leaderboard.slice(0, limit);
  }

  // Clean up inactive players (optional)
  cleanupInactiveStats(maxInactiveDays = 30) {
    const now = Date.now();
    const maxInactiveTime = maxInactiveDays * 24 * 60 * 60 * 1000;

    for (const [playerId, playerStats] of this.playerStats.entries()) {
      let isActive = false;
      for (const comboStats of playerStats.combos.values()) {
        if (now - comboStats.lastActivation < maxInactiveTime) {
          isActive = true;
          break;
        }
      }
      if (!isActive) {
        this.playerStats.delete(playerId);
      }
    }
  }
}

export default ComboLeaderboardSystem; 