import { EventEmitter } from 'events';

export class Matchmaker extends EventEmitter {
  constructor(io) {
    super();
    this.io = io;
    this.rooms = new Map();
    this.playerRooms = new Map(); // Track which room each player is in
    this.queuedPlayers = new Map(); // Players waiting for match
    
    // Configuration
    this.config = {
      modes: {
        FFA: {
          name: 'Free For All',
          minPlayers: 1,
          maxPlayers: 50,
          autoStart: true,
          teamBased: false
        },
        TEAMS: {
          name: 'Teams',
          minPlayers: 4,
          maxPlayers: 40,
          teamSize: 2,
          autoStart: true,
          teamBased: true,
          balanceTeams: true
        },
        BATTLE_ROYALE: {
          name: 'Battle Royale',
          minPlayers: 10,
          maxPlayers: 100,
          autoStart: true,
          shrinkMap: true,
          teamBased: false
        }
      },
      matchmakingInterval: 5000, // 5 seconds
      roomCleanupInterval: 30000, // 30 seconds
      maxQueueTime: 60000, // 1 minute
      skillMatchingRange: 200, // Initial ELO range for matching
      expandingSkillRange: 50, // How much to expand range per check
      maxSkillRange: 500 // Maximum ELO difference allowed
    };

    // Start background processes
    this.startMatchmaking();
    this.startRoomCleanup();
  }

  startMatchmaking() {
    setInterval(() => {
      this.processQueue();
    }, this.config.matchmakingInterval);
  }

  startRoomCleanup() {
    setInterval(() => {
      this.cleanupRooms();
    }, this.config.roomCleanupInterval);
  }

  createRoom(mode = 'FFA', options = {}) {
    const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const modeConfig = this.config.modes[mode];
    
    if (!modeConfig) {
      throw new Error(`Invalid game mode: ${mode}`);
    }

    const room = {
      id: roomId,
      mode,
      players: new Map(),
      teams: modeConfig.teamBased ? new Map() : null,
      state: 'waiting', // waiting, starting, active, ending
      createdAt: Date.now(),
      startTime: null,
      endTime: null,
      settings: {
        ...modeConfig,
        ...options
      },
      stats: {
        totalPlayers: 0,
        maxPlayersReached: 0,
        averagePlayerTime: 0
      }
    };

    this.rooms.set(roomId, room);
    this.emit('roomCreated', room);
    return room;
  }

  addPlayerToQueue(playerId, preferences = {}) {
    const queueEntry = {
      playerId,
      preferences,
      joinTime: Date.now(),
      skill: preferences.skill || 1500, // Default ELO
      expandedRange: 0
    };

    this.queuedPlayers.set(playerId, queueEntry);
    this.emit('playerQueued', queueEntry);
    
    return queueEntry;
  }

  removePlayerFromQueue(playerId) {
    const wasQueued = this.queuedPlayers.delete(playerId);
    if (wasQueued) {
      this.emit('playerDequeued', playerId);
    }
    return wasQueued;
  }

  processQueue() {
    // Sort queued players by wait time
    const sortedPlayers = Array.from(this.queuedPlayers.values())
      .sort((a, b) => a.joinTime - b.joinTime);

    for (const player of sortedPlayers) {
      if (!this.queuedPlayers.has(player.playerId)) continue; // Player may have been matched already

      const match = this.findMatch(player);
      if (match) {
        this.assignPlayerToRoom(player.playerId, match.id);
      } else {
        // Expand skill range for players waiting too long
        const waitTime = Date.now() - player.joinTime;
        if (waitTime > this.config.maxQueueTime) {
          player.expandedRange += this.config.expandingSkillRange;
        }
      }
    }
  }

  findMatch(player) {
    const { mode = 'FFA' } = player.preferences;
    
    // First try to find a suitable existing room
    for (const [roomId, room] of this.rooms) {
      if (this.isRoomSuitableForPlayer(room, player)) {
        return room;
      }
    }

    // Create new room if no suitable room found
    if (this.canCreateRoom(mode)) {
      return this.createRoom(mode, player.preferences);
    }

    return null;
  }

  isRoomSuitableForPlayer(room, player) {
    if (room.state !== 'waiting' && room.state !== 'starting') return false;
    if (room.players.size >= room.settings.maxPlayers) return false;
    if (room.settings.mode !== player.preferences.mode) return false;

    // Check skill range if skill-based matchmaking is enabled
    if (room.settings.skillBased) {
      const roomAvgSkill = this.calculateRoomAverageSkill(room);
      const skillDiff = Math.abs(roomAvgSkill - player.skill);
      const maxRange = this.config.skillMatchingRange + player.expandedRange;
      
      if (skillDiff > maxRange) return false;
    }

    return true;
  }

  calculateRoomAverageSkill(room) {
    if (room.players.size === 0) return 1500;
    
    const totalSkill = Array.from(room.players.values())
      .reduce((sum, player) => sum + (player.skill || 1500), 0);
    
    return totalSkill / room.players.size;
  }

  canCreateRoom(mode) {
    const activeRooms = Array.from(this.rooms.values())
      .filter(room => room.mode === mode && room.state !== 'ending');
    
    // Implement room creation limits based on active players and server load
    return activeRooms.length < 10; // Example limit
  }

  assignPlayerToRoom(playerId, roomId) {
    const room = this.rooms.get(roomId);
    const player = this.queuedPlayers.get(playerId);
    
    if (!room || !player) return false;

    // Remove from queue
    this.removePlayerFromQueue(playerId);

    // Add to room
    room.players.set(playerId, {
      id: playerId,
      joinTime: Date.now(),
      skill: player.skill,
      team: null
    });

    // Assign team if needed
    if (room.settings.teamBased) {
      this.assignPlayerToTeam(room, playerId);
    }

    // Track player's room
    this.playerRooms.set(playerId, roomId);

    // Update room stats
    room.stats.totalPlayers++;
    room.stats.maxPlayersReached = Math.max(room.stats.maxPlayersReached, room.players.size);

    // Check if room should start
    this.checkRoomStart(room);

    this.emit('playerJoinedRoom', { playerId, roomId });
    return true;
  }

  assignPlayerToTeam(room, playerId) {
    if (!room.teams) return;

    // Find the team with the fewest players
    let smallestTeam = null;
    let smallestSize = Infinity;

    for (const [teamId, team] of room.teams) {
      if (team.players.size < smallestSize) {
        smallestTeam = teamId;
        smallestSize = team.players.size;
      }
    }

    // Create new team if needed
    if (!smallestTeam || smallestSize >= room.settings.teamSize) {
      smallestTeam = `team-${room.teams.size + 1}`;
      room.teams.set(smallestTeam, {
        id: smallestTeam,
        players: new Set(),
        score: 0
      });
    }

    // Assign player to team
    room.teams.get(smallestTeam).players.add(playerId);
    room.players.get(playerId).team = smallestTeam;
  }

  removePlayerFromRoom(playerId) {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return false;

    const room = this.rooms.get(roomId);
    if (!room) return false;

    // Remove from team if needed
    if (room.teams && room.players.get(playerId)?.team) {
      const teamId = room.players.get(playerId).team;
      room.teams.get(teamId)?.players.delete(playerId);
    }

    // Remove player
    room.players.delete(playerId);
    this.playerRooms.delete(playerId);

    // Update room state
    this.checkRoomEnd(room);

    this.emit('playerLeftRoom', { playerId, roomId });
    return true;
  }

  checkRoomStart(room) {
    if (room.state !== 'waiting') return;

    const shouldStart = room.settings.autoStart && 
      room.players.size >= room.settings.minPlayers;

    if (shouldStart) {
      room.state = 'starting';
      room.startTime = Date.now();
      this.emit('roomStarting', room);

      // Start game after short delay
      setTimeout(() => {
        if (room.state === 'starting') {
          room.state = 'active';
          this.emit('roomStarted', room);
        }
      }, 3000);
    }
  }

  checkRoomEnd(room) {
    if (room.state !== 'active') return;

    const shouldEnd = room.players.size < room.settings.minPlayers;

    if (shouldEnd) {
      room.state = 'ending';
      room.endTime = Date.now();
      this.emit('roomEnding', room);

      // Clean up room after delay
      setTimeout(() => {
        this.rooms.delete(room.id);
        this.emit('roomClosed', room);
      }, 5000);
    }
  }

  cleanupRooms() {
    const now = Date.now();

    for (const [roomId, room] of this.rooms) {
      // Remove empty rooms
      if (room.players.size === 0) {
        this.rooms.delete(roomId);
        this.emit('roomClosed', room);
        continue;
      }

      // Remove inactive rooms
      const inactiveTime = now - (room.endTime || room.startTime || room.createdAt);
      if (inactiveTime > 3600000) { // 1 hour
        this.rooms.delete(roomId);
        this.emit('roomClosed', room);
        continue;
      }
    }
  }

  getRoomInfo(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    return {
      id: room.id,
      mode: room.mode,
      state: room.state,
      playerCount: room.players.size,
      maxPlayers: room.settings.maxPlayers,
      teams: room.teams ? Array.from(room.teams.values()) : null,
      createdAt: room.createdAt,
      startTime: room.startTime,
      endTime: room.endTime,
      stats: room.stats
    };
  }

  getPlayerRoom(playerId) {
    const roomId = this.playerRooms.get(playerId);
    return roomId ? this.getRoomInfo(roomId) : null;
  }

  getActiveRooms() {
    return Array.from(this.rooms.values())
      .filter(room => room.state !== 'ending')
      .map(room => this.getRoomInfo(room.id));
  }
} 