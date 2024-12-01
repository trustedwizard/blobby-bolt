export class GameStateManager {
  constructor(config) {
    this.worldSize = config.worldSize;
    this.maxPlayers = config.maxPlayers;
    this.players = new Map();
    this.food = new Map();
    this.leaderboard = [];
    this.aiPlayers = new Map();
    this.teams = new Map();
    this.lastAIUpdate = Date.now();
    this.aiUpdateInterval = 100; // Update AI every 100ms
  }

  addPlayer(id, data) {
    this.players.set(id, {
      ...data,
      lastUpdate: Date.now(),
      score: data.score || 0,
      radius: data.radius || 20,
      trail: data.trail || [],
      teamId: data.teamId,
      lastCollisionTime: Date.now()
    });
    this.updateLeaderboard();

    // Add player to team if specified
    if (data.teamId) {
      this.addPlayerToTeam(id, data.teamId);
    }
  }

  addPlayerToTeam(playerId, teamId) {
    const team = this.teams.get(teamId);
    if (team) {
      team.players.push(playerId);
      this.teams.set(teamId, team);
    }
  }

  createTeam(teamData) {
    const team = {
      id: teamData.id,
      name: teamData.name,
      color: teamData.color,
      players: [],
      score: 0
    };
    this.teams.set(team.id, team);
    return team;
  }

  updatePlayerPosition(id, position) {
    const player = this.players.get(id);
    if (player) {
      const updatedPlayer = {
        ...player,
        ...position,
        lastUpdate: Date.now()
      };

      // Update trail
      updatedPlayer.trail = [
        { x: position.x, y: position.y },
        ...(player.trail || []).slice(0, 9)
      ];

      this.players.set(id, updatedPlayer);

      // Update team score if player is in a team
      if (player.teamId) {
        this.updateTeamScore(player.teamId);
      }
    }
  }

  updateTeamScore(teamId) {
    const team = this.teams.get(teamId);
    if (team) {
      const teamScore = team.players.reduce((score, playerId) => {
        const player = this.players.get(playerId);
        return score + (player ? player.score : 0);
      }, 0);
      team.score = teamScore;
      this.teams.set(teamId, team);
    }
  }

  getState() {
    return {
      players: Array.from(this.players.values()),
      food: Array.from(this.food.values()),
      leaderboard: this.leaderboard,
      teams: Array.from(this.teams.values())
    };
  }

  update() {
    this.cleanupInactivePlayers();
    this.updateLeaderboard();
    this.updateAIPlayers();
  }

  updateAIPlayers() {
    const now = Date.now();
    if (now - this.lastAIUpdate < this.aiUpdateInterval) return;

    for (const [id, aiPlayer] of this.aiPlayers.entries()) {
      this.updateAIBehavior(aiPlayer);
    }
    this.lastAIUpdate = now;
  }

  updateAIBehavior(aiPlayer) {
    // Find nearest food or smaller player
    const target = this.findNearestTarget(aiPlayer);
    if (!target) return;

    // Move towards target
    const dx = target.x - aiPlayer.x;
    const dy = target.y - aiPlayer.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      const speed = 2; // AI movement speed
      const vx = (dx / distance) * speed;
      const vy = (dy / distance) * speed;

      // Update AI position
      const newX = Math.max(0, Math.min(this.worldSize, aiPlayer.x + vx));
      const newY = Math.max(0, Math.min(this.worldSize, aiPlayer.y + vy));

      this.updatePlayerPosition(aiPlayer.id, {
        x: newX,
        y: newY,
        velocity: { x: vx, y: vy }
      });
    }
  }

  findNearestTarget(aiPlayer) {
    let nearestTarget = null;
    let minDistance = Infinity;

    // Check food
    for (const food of this.food.values()) {
      const distance = this.getDistance(aiPlayer, food);
      if (distance < minDistance) {
        minDistance = distance;
        nearestTarget = food;
      }
    }

    // Check smaller players
    for (const player of this.players.values()) {
      if (player.id !== aiPlayer.id && player.radius * 1.1 < aiPlayer.radius) {
        const distance = this.getDistance(aiPlayer, player);
        if (distance < minDistance) {
          minDistance = distance;
          nearestTarget = player;
        }
      }
    }

    return nearestTarget;
  }

  getDistance(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  cleanupInactivePlayers() {
    const now = Date.now();
    for (const [id, player] of this.players.entries()) {
      if (now - player.lastUpdate > 10000) { // 10 seconds timeout
        this.players.delete(id);
        if (player.isAI) {
          this.aiPlayers.delete(id);
        }
        if (player.teamId) {
          this.removePlayerFromTeam(id, player.teamId);
        }
      }
    }
  }

  removePlayerFromTeam(playerId, teamId) {
    const team = this.teams.get(teamId);
    if (team) {
      team.players = team.players.filter(id => id !== playerId);
      if (team.players.length === 0) {
        this.teams.delete(teamId);
      } else {
        this.teams.set(teamId, team);
        this.updateTeamScore(teamId);
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
        score: player.score,
        teamId: player.teamId,
        isAI: player.isAI || false
      }));
  }

  getRealPlayerCount() {
    return Array.from(this.players.values()).filter(player => !player.isAI).length;
  }

  getAIPlayerCount() {
    return Array.from(this.players.values()).filter(player => player.isAI).length;
  }

  spawnAIPlayer() {
    const id = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const aiPlayer = {
      id,
      x: Math.random() * this.worldSize,
      y: Math.random() * this.worldSize,
      radius: 20,
      color: Math.floor(Math.random() * 0xFFFFFF),
      name: `AI Bot ${this.getAIPlayerCount() + 1}`,
      emoji: '🤖',
      trail: [],
      score: 0,
      isAI: true,
      lastUpdate: Date.now(),
      velocity: { x: 0, y: 0 },
      splitCooldown: 0,
      ejectCooldown: 0
    };

    this.players.set(id, aiPlayer);
    this.aiPlayers.set(id, aiPlayer);
    return aiPlayer;
  }

  removeExcessAIPlayers(count) {
    const aiPlayers = Array.from(this.players.values())
      .filter(player => player.isAI)
      .sort((a, b) => a.score - b.score); // Remove lowest scoring AIs first

    for (let i = 0; i < count && i < aiPlayers.length; i++) {
      const aiPlayer = aiPlayers[i];
      this.players.delete(aiPlayer.id);
      this.aiPlayers.delete(aiPlayer.id);
      if (aiPlayer.teamId) {
        this.removePlayerFromTeam(aiPlayer.id, aiPlayer.teamId);
      }
    }
  }

  addFood(food) {
    this.food.set(food.id, food);
  }

  removeFood(foodId) {
    this.food.delete(foodId);
  }

  handleCollision(player1Id, player2Id) {
    const player1 = this.players.get(player1Id);
    const player2 = this.players.get(player2Id);

    if (!player1 || !player2) return;

    const now = Date.now();
    if (now - player1.lastCollisionTime < 1000 || now - player2.lastCollisionTime < 1000) {
      return; // Collision cooldown
    }

    // Update collision timestamps
    player1.lastCollisionTime = now;
    player2.lastCollisionTime = now;

    // Handle team collisions differently
    if (player1.teamId && player2.teamId && player1.teamId === player2.teamId) {
      return; // Team members don't collide
    }

    // Basic collision resolution
    if (player1.radius > player2.radius * 1.1) {
      // Player 1 eats Player 2
      player1.score += Math.floor(player2.score * 0.8);
      player1.radius = Math.sqrt(Math.pow(player1.radius, 2) + Math.pow(player2.radius, 2));
      this.players.delete(player2Id);
      if (player2.isAI) this.aiPlayers.delete(player2Id);
    } else if (player2.radius > player1.radius * 1.1) {
      // Player 2 eats Player 1
      player2.score += Math.floor(player1.score * 0.8);
      player2.radius = Math.sqrt(Math.pow(player2.radius, 2) + Math.pow(player1.radius, 2));
      this.players.delete(player1Id);
      if (player1.isAI) this.aiPlayers.delete(player1Id);
    }

    this.updateLeaderboard();
  }
} 