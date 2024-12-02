export class GameStateManager {
  constructor({ worldSize, maxPlayers }) {
    this.worldSize = worldSize;
    this.maxPlayers = maxPlayers;
    this.players = new Map();
    this.rooms = new Map();
    this.aiPlayers = new Set();
  }

  // Player management
  getPlayer(playerId) {
    return this.players.get(playerId);
  }

  addPlayer(playerId, playerData) {
    this.players.set(playerId, {
      ...playerData,
      x: Math.random() * this.worldSize,
      y: Math.random() * this.worldSize,
      radius: 30,
      mass: 10,
      velocity: { x: 0, y: 0 },
      color: Math.floor(Math.random() * 0xFFFFFF),
      activePowerUps: []
    });
    return this.players.get(playerId);
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
  }

  splitPlayer(playerId) {
    const player = this.players.get(playerId);
    if (player && player.mass >= 20) {  // Minimum mass required to split
      const newMass = player.mass / 2;
      player.mass = newMass;
      
      // Create new blob in split direction
      const splitBlob = {
        ...player,
        id: `${playerId}-split-${Date.now()}`,
        mass: newMass,
        x: player.x + player.velocity.x * 2,
        y: player.y + player.velocity.y * 2
      };
      
      this.players.set(splitBlob.id, splitBlob);
    }
  }

  ejectMass(playerId) {
    const player = this.players.get(playerId);
    if (player && player.mass > 20) {  // Minimum mass required to eject
      player.mass -= 10;
      // Create ejected mass
      const ejectedMass = {
        id: `ejected-${Date.now()}`,
        x: player.x + player.velocity.x * 2,
        y: player.y + player.velocity.y * 2,
        mass: 10,
        velocity: {
          x: player.velocity.x * 2,
          y: player.velocity.y * 2
        }
      };
      return ejectedMass;
    }
    return null;
  }

  // Room management methods
  createRoom(roomConfig) {
    const room = {
      ...roomConfig,
      players: new Map(),
      state: 'waiting',
      createdAt: Date.now()
    };
    this.rooms.set(room.id, room);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  removeRoom(roomId) {
    return this.rooms.delete(roomId);
  }

  getRooms() {
    return Array.from(this.rooms.values());
  }

  addPlayerToRoom(roomId, playerId, playerData) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.players.set(playerId, playerData);
      // Also add player to global players list
      this.addPlayer(playerId, playerData);
      return true;
    }
    return false;
  }

  removePlayerFromRoom(roomId, playerId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.players.delete(playerId);
      // Also remove from global players list
      this.removePlayer(playerId);
      if (room.players.size === 0) {
        this.rooms.delete(roomId);
      }
      return true;
    }
    return false;
  }

  // Game state methods
  update() {
    // Update player positions based on velocity
    for (const [playerId, player] of this.players) {
      if (player.velocity) {
        player.x += player.velocity.x;
        player.y += player.velocity.y;
        
        // Keep player within bounds
        player.x = Math.max(player.radius, Math.min(this.worldSize - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(this.worldSize - player.radius, player.y));
      }
    }
  }

  // Player counting methods
  getRealPlayerCount() {
    return Array.from(this.players.values()).filter(player => !player.isAI).length;
  }

  getAIPlayerCount() {
    return Array.from(this.players.values()).filter(player => player.isAI).length;
  }

  getTotalPlayerCount() {
    return this.players.size;
  }
} 