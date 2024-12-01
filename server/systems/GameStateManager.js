export class GameStateManager {
  constructor(config) {
    this.worldSize = config.worldSize;
    this.maxPlayers = config.maxPlayers;
    this.players = new Map();
    this.food = new Map();
    this.leaderboard = [];
  }

  addPlayer(id, data) {
    this.players.set(id, {
      ...data,
      lastUpdate: Date.now()
    });
    this.updateLeaderboard();
  }

  updatePlayerPosition(id, position) {
    const player = this.players.get(id);
    if (player) {
      this.players.set(id, {
        ...player,
        ...position,
        lastUpdate: Date.now()
      });
    }
  }

  getState() {
    return {
      players: Array.from(this.players.values()),
      food: Array.from(this.food.values()),
      leaderboard: this.leaderboard
    };
  }

  update() {
    this.cleanupInactivePlayers();
    this.updateLeaderboard();
  }

  cleanupInactivePlayers() {
    const now = Date.now();
    for (const [id, player] of this.players.entries()) {
      if (now - player.lastUpdate > 10000) { // 10 seconds timeout
        this.players.delete(id);
      }
    }
  }

  updateLeaderboard() {
    this.leaderboard = Array.from(this.players.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(player => ({
        id: player.id,
        name: player.name,
        score: player.score
      }));
  }
} 