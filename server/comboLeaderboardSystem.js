import { POWER_UP_COMBOS } from '../shared/types/powerups.js';

export class ComboLeaderboardSystem {
  constructor(io) {
    this.io = io;
    this.playerCombos = new Map(); // Track active combos per player
    this.comboLeaderboard = new Map(); // Track best combos
    this.comboHistory = new Map(); // Track historical combos
    this.achievements = new Map(); // Track player achievements
    this.comboStreaks = new Map(); // Track combo streaks
    this.lastUpdate = Date.now();
    this.updateInterval = 1000; // Update leaderboard every second
    this.maxHistoryPerPlayer = 50; // Maximum combo history per player
    this.maxLeaderboardEntries = 100; // Maximum leaderboard entries
    this.streakThreshold = 3; // Number of combos needed for a streak
    this.comboCooldown = 5000; // 5 seconds cooldown between combos
  }

  update() {
    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval) return;
    this.lastUpdate = now;

    // Clean up expired combos
    this.cleanupExpiredCombos();
    
    // Update leaderboard
    this.updateLeaderboard();
    
    // Emit updated leaderboard
    this.emitLeaderboardUpdate();
  }

  handlePowerUpActivation(playerId, powerUpType) {
    const playerCombos = this.playerCombos.get(playerId) || [];
    const now = Date.now();

    // Check combo cooldown
    const lastCombo = playerCombos[playerCombos.length - 1];
    if (lastCombo && now - lastCombo.timestamp < this.comboCooldown) {
      return;
    }

    // Add new power-up to player's active set
    playerCombos.push({
      type: powerUpType,
      timestamp: now
    });

    // Check for possible combos
    this.checkForCombos(playerId, playerCombos);
    
    // Update player's combo list
    this.playerCombos.set(playerId, playerCombos);
  }

  checkForCombos(playerId, activePowerUps) {
    // Get active power-up types
    const activeTypes = new Set(activePowerUps.map(p => p.type));

    // Check each combo possibility
    Object.entries(POWER_UP_COMBOS).forEach(([comboName, combo]) => {
      const hasAllTypes = combo.types.every(type => activeTypes.has(type));
      
      if (hasAllTypes) {
        this.activateCombo(playerId, comboName, combo);
      }
    });
  }

  activateCombo(playerId, comboName, combo) {
    const now = Date.now();
    const comboData = {
      playerId,
      comboName,
      types: combo.types,
      timestamp: now,
      score: this.calculateComboScore(combo),
      bonusEffect: combo.bonusEffect
    };

    // Add to history
    const playerHistory = this.comboHistory.get(playerId) || [];
    playerHistory.unshift(comboData);
    
    // Trim history if needed
    if (playerHistory.length > this.maxHistoryPerPlayer) {
      playerHistory.pop();
    }
    
    this.comboHistory.set(playerId, playerHistory);

    // Update streak
    this.updateComboStreak(playerId, comboName);

    // Check for achievements
    this.checkAchievements(playerId, comboData);

    // Emit combo activation
    this.io.emit('combo:activated', {
      playerId,
      comboName,
      types: combo.types,
      bonusEffect: combo.bonusEffect
    });
  }

  calculateComboScore(combo) {
    // Base score for combo
    let score = combo.types.length * 100;

    // Bonus for rare combinations
    if (combo.bonusEffect) {
      score *= 1.5;
    }

    return Math.floor(score);
  }

  updateComboStreak(playerId, comboName) {
    const playerStreaks = this.comboStreaks.get(playerId) || new Map();
    const streak = playerStreaks.get(comboName) || {
      count: 0,
      lastActivation: 0
    };

    const now = Date.now();
    
    // Check if streak is still active (within last 30 seconds)
    if (now - streak.lastActivation < 30000) {
      streak.count++;
    } else {
      streak.count = 1;
    }

    streak.lastActivation = now;
    playerStreaks.set(comboName, streak);
    this.comboStreaks.set(playerId, playerStreaks);

    // Emit streak milestone if reached
    if (streak.count >= this.streakThreshold) {
      this.io.emit('combo:streak', {
        playerId,
        comboName,
        streakCount: streak.count
      });
    }
  }

  checkAchievements(playerId, comboData) {
    const playerAchievements = this.achievements.get(playerId) || new Set();
    const totalCombos = (this.comboHistory.get(playerId) || []).length;

    // Check for combo-related achievements
    const achievements = [];

    // First combo achievement
    if (totalCombos === 1) {
      achievements.push('FIRST_COMBO');
    }

    // Combo master (10 different combos)
    const uniqueCombos = new Set(this.comboHistory.get(playerId)?.map(c => c.comboName));
    if (uniqueCombos.size >= 10) {
      achievements.push('COMBO_MASTER');
    }

    // Streak achievements
    const streak = this.comboStreaks.get(playerId)?.get(comboData.comboName);
    if (streak?.count >= 5) {
      achievements.push('COMBO_STREAK_5');
    }
    if (streak?.count >= 10) {
      achievements.push('COMBO_STREAK_10');
    }

    // Add new achievements and emit
    achievements.forEach(achievement => {
      if (!playerAchievements.has(achievement)) {
        playerAchievements.add(achievement);
        this.io.emit('achievement:unlocked', {
          playerId,
          achievement,
          timestamp: Date.now()
        });
      }
    });

    this.achievements.set(playerId, playerAchievements);
  }

  updateLeaderboard() {
    // Get all combo scores
    const scores = [];
    this.comboHistory.forEach((history, playerId) => {
      const totalScore = history.reduce((sum, combo) => sum + combo.score, 0);
      const uniqueCombos = new Set(history.map(c => c.comboName)).size;
      const maxStreak = Math.max(...Array.from(this.comboStreaks.get(playerId)?.values() || [])
        .map(s => s.count));

      scores.push({
        playerId,
        totalScore,
        uniqueCombos,
        maxStreak,
        lastComboTime: history[0]?.timestamp || 0
      });
    });

    // Sort and trim leaderboard
    scores.sort((a, b) => b.totalScore - a.totalScore);
    const topScores = scores.slice(0, this.maxLeaderboardEntries);

    // Update leaderboard
    this.comboLeaderboard.clear();
    topScores.forEach(score => {
      this.comboLeaderboard.set(score.playerId, score);
    });
  }

  emitLeaderboardUpdate() {
    this.io.emit('comboLeaderboard:update', Array.from(this.comboLeaderboard.values()));
  }

  cleanupExpiredCombos() {
    const now = Date.now();
    this.playerCombos.forEach((combos, playerId) => {
      // Remove combos older than 30 seconds
      const activeCombos = combos.filter(combo => now - combo.timestamp < 30000);
      if (activeCombos.length !== combos.length) {
        this.playerCombos.set(playerId, activeCombos);
      }
    });
  }

  getPlayerStats(playerId) {
    return {
      combos: this.comboHistory.get(playerId) || [],
      achievements: Array.from(this.achievements.get(playerId) || []),
      streaks: Object.fromEntries(this.comboStreaks.get(playerId) || new Map()),
      leaderboardPosition: this.getLeaderboardPosition(playerId)
    };
  }

  getLeaderboardPosition(playerId) {
    const scores = Array.from(this.comboLeaderboard.values());
    return scores.findIndex(score => score.playerId === playerId) + 1;
  }

  resetPlayerStats(playerId) {
    this.playerCombos.delete(playerId);
    this.comboHistory.delete(playerId);
    this.comboStreaks.delete(playerId);
    // Don't reset achievements - they should persist
  }

  getTopPlayers(limit = 10) {
    return Array.from(this.comboLeaderboard.values())
      .slice(0, limit)
      .map(score => ({
        ...score,
        achievements: Array.from(this.achievements.get(score.playerId) || [])
      }));
  }
}

export default ComboLeaderboardSystem; 