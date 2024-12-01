export function createMatchmaker(config) {
  const queue = new Map();
  const activeMatches = new Map();
  const minPlayersToStart = 2;
  const regions = ['NA', 'EU', 'ASIA', 'SA', 'OCE'];

  function findMatch(player) {
    const matches = [];
    const now = Date.now();
    let timeInQueue = now - player.queueStartTime;
    let expandedSkillRange = Math.min(2000, config.skillRange + Math.floor(timeInQueue / 10000) * 100);
    
    for (const [_, queuedPlayer] of queue) {
      if (isCompatibleMatch(player, queuedPlayer, expandedSkillRange)) {
        matches.push(queuedPlayer);
      }
      
      if (matches.length >= config.maxPlayersPerGame - 1) break;
    }

    if (matches.length >= minPlayersToStart - 1) {
      createGame([player, ...matches]);
    } else {
      // Notify player about queue status
      player.socket.emit('matchmaking:status', 
        `Players needed: ${minPlayersToStart - matches.length - 1}`);
    }
  }

  function isCompatibleMatch(player1, player2, skillRange) {
    const skillDiff = Math.abs(player1.skillLevel - player2.skillLevel);
    const sameRegion = !player1.preferences.region || 
                      !player2.preferences.region || 
                      player1.preferences.region === player2.preferences.region;
    const sameGameMode = player1.preferences.gameMode === player2.preferences.gameMode;
    
    return skillDiff <= skillRange && sameRegion && sameGameMode;
  }

  function balanceTeams(players) {
    // Sort players by skill level
    players.sort((a, b) => b.skillLevel - a.skillLevel);
    
    const teams = [[], []];
    let teamIndex = 0;
    
    // Distribute players in snake draft order
    players.forEach(player => {
      teams[teamIndex].push(player);
      teamIndex = (teamIndex + 1) % 2;
    });
    
    // Flatten and return balanced teams
    return teams[0].concat(teams[1]);
  }

  function createGame(players) {
    const gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Balance teams if needed
    if (players[0].preferences.gameMode === 'teams') {
      players = balanceTeams(players);
    }
    
    // Remove players from queue
    players.forEach(p => queue.delete(p.id));
    
    // Create game room
    const teams = players[0].preferences.gameMode === 'teams' ? [
      { id: 'team1', name: 'Red Team', color: 0xff0000, players: [] },
      { id: 'team2', name: 'Blue Team', color: 0x0000ff, players: [] }
    ] : [];

    const game = {
      id: gameId,
      players: new Set(players.map(p => p.id)),
      teams,
      gameMode: players[0].preferences.gameMode,
      startTime: Date.now(),
      state: 'starting'
    };
    
    // Assign teams if team mode
    if (game.gameMode === 'teams') {
      players.forEach((p, i) => {
        const teamIndex = Math.floor(i % 2);
        game.teams[teamIndex].players.push(p.id);
      });
    }
    
    activeMatches.set(gameId, game);
    
    // Notify players and create room
    players.forEach(p => {
      p.socket.join(gameId);
      p.socket.emit('matchmaking:found', gameId);
    });

    // Add collision system initialization for new game
    const gameCollisionSystem = new CollisionSystem(config.worldSize);
    game.collisionSystem = gameCollisionSystem;
    
    // Add collision check interval for this game
    const collisionInterval = setInterval(() => {
      if (game.state !== 'active') {
        clearInterval(collisionInterval);
        return;
      }
      
      // Get all entities in this game
      const entities = [
        ...Array.from(gameState.players.values()).filter(p => game.players.has(p.id)),
        ...aiSystem.getAIBlobs()
      ];
      
      // Check collisions for this game
      const collisions = game.collisionSystem.checkCollisions(entities, foodSystem);
      
      // Resolve collisions
      if (collisions.length > 0) {
        game.collisionSystem.resolveCollisions(collisions, {
          foodSystem,
          aiSystem,
          players: gameState.players,
          io: config.io.to(gameId)
        });
      }
    }, 50);
    
    // Store interval for cleanup
    game.intervals = game.intervals || [];
    game.intervals.push(collisionInterval);
    
    // Start game after delay
    setTimeout(() => {
      if (activeMatches.has(gameId)) {
        game.state = 'active';
        config.io.to(gameId).emit('game:start', game);
      }
    }, 3000);
  }

  function updatePlayerSkill(playerId, gameResult) {
    const player = queue.get(playerId);
    if (!player) return;

    const K_FACTOR = 32;
    const expectedScore = 1 / (1 + Math.pow(10, (gameResult.opponentSkill - player.skillLevel) / 400));
    const actualScore = gameResult.won ? 1 : 0;
    
    player.skillLevel += K_FACTOR * (actualScore - expectedScore);
  }

  // Add activity tracking
  function updatePlayerActivity(playerId) {
    const player = queue.get(playerId);
    if (player) {
      player.lastActivity = Date.now();
    }
  }

  // Add cleanup interval
  setInterval(() => {
    // Remove inactive players from queue
    for (const [playerId, player] of queue.entries()) {
      if (Date.now() - player.lastActivity > config.matchTimeout) {
        queue.delete(playerId);
        player.socket.emit('matchmaking:error', 'Matchmaking timeout');
      }
    }
  }, 10000); // Check every 10 seconds

  return {
    addToQueue(player) {
      player.queueStartTime = Date.now();
      queue.set(player.id, player);
      
      // Initial status update
      player.socket.emit('matchmaking:status', 'Searching for players...');
      
      // Set queue timeout
      setTimeout(() => {
        if (queue.has(player.id)) {
          queue.delete(player.id);
          player.socket.emit('matchmaking:error', 'Match finding timeout');
        }
      }, config.matchTimeout);
      
      findMatch(player);
    },
    
    removeFromQueue(playerId) {
      queue.delete(playerId);
    },
    
    getActiveMatches() {
      return activeMatches;
    },

    updatePlayerSkill,
    
    getRegions() {
      return regions;
    },

    getQueueStats() {
      return {
        playersInQueue: queue.size,
        activeGames: activeMatches.size,
        queuedGameModes: Array.from(queue.values()).reduce((acc, player) => {
          acc[player.preferences.gameMode] = (acc[player.preferences.gameMode] || 0) + 1;
          return acc;
        }, {})
      };
    }
  };
} 