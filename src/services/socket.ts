import io, { Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';
import { soundService } from '../services/soundService';
import { CONFIG } from '../constants/gameConfig';
import { LeaderboardEntry, LeaderboardUpdate, ComboStats } from '../types/leaderboard';
import { MatchPreferences } from '../types/matchmaking';
import { PowerUpType } from '../types/powerups';

interface MatchmakingPreferences {
  gameMode: 'ffa' | 'teams' | 'battle-royale';
  region?: string;
  skillLevel: number;
}

export class SocketService {
  private socket: Socket | null = null;
  private static instance: SocketService;

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  connect(serverUrl: string = 'http://localhost:3001'): void {
    if (this.socket?.connected) return;

    this.socket = io(serverUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to server');
      useGameStore.setState({ isConnected: true });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      useGameStore.setState({ isConnected: false });
    });

    this.socket.on('game:state', (gameState) => {
      useGameStore.setState({
        players: new Map(gameState.players || []),
        food: new Map(gameState.food || []),
        powerUps: new Map(gameState.powerUps || []),
        obstacles: new Map(gameState.obstacles || []),
        leaderboard: gameState.leaderboard || []
      });
    });

    // Matchmaking handlers
    this.socket.on('matchmaking:status', (status: string) => {
      useGameStore.setState({
        matchmaking: {
          ...useGameStore.getState().matchmaking,
          status
        }
      });
    });

    this.socket.on('matchmaking:found', (gameId: string) => {
      useGameStore.setState({
        matchmaking: {
          ...useGameStore.getState().matchmaking,
          isSearching: false,
          status: 'found'
        }
      });
      this.emit('game:join', { gameId });
    });

    // Player update handlers
    this.socket.on('player:update', (update) => {
      const state = useGameStore.getState();
      if (state.player?.id !== update.id) {
        const players = new Map(state.players);
        players.set(update.id, {
          ...players.get(update.id),
          ...update
        });
        useGameStore.setState({ players });
      }
    });

    // Power-up handlers
    this.socket.on('powerup:spawn', (powerUp) => {
      const powerUps = new Map(useGameStore.getState().powerUps);
      powerUps.set(powerUp.id, powerUp);
      useGameStore.setState({ powerUps });
    });

    this.socket.on('powerup:collected', (data: { powerUpId: string, playerId: string, type: PowerUpType }) => {
      const state = useGameStore.getState();
      const powerUps = new Map(state.powerUps);
      powerUps.delete(data.powerUpId);
      
      useGameStore.setState({ powerUps });
      useGameStore.getState().handlePowerUpCollect(data.powerUpId, data.playerId, data.type);
    });

    // Restore leaderboard handlers
    this.socket.on('leaderboard:update', (leaderboard) => {
      useGameStore.setState({ leaderboard });
    });
  }

  // Restore matchmaking methods
  setupMatchmakingListeners(callbacks: {
    onMatchFound: (gameId: string) => void;
    onMatchmakingStatus: (status: string) => void;
    onMatchmakingError: (error: string) => void;
  }): void {
    if (!this.socket) {
      console.warn('Cannot setup matchmaking listeners: Socket not initialized');
      return;
    }

    // Remove any existing listeners to prevent duplicates
    this.socket.off('matchmaking:found');
    this.socket.off('matchmaking:status');
    this.socket.off('matchmaking:error');

    // Setup new listeners
    this.socket.on('matchmaking:found', callbacks.onMatchFound);
    this.socket.on('matchmaking:status', callbacks.onMatchmakingStatus);
    this.socket.on('matchmaking:error', callbacks.onMatchmakingError);
  }

  findMatch(preferences: MatchmakingPreferences): void {
    if (!this.socket?.connected) {
      console.warn('Cannot find match: Socket not connected');
      return;
    }
    this.socket.emit('matchmaking:start', preferences);
  }

  cancelMatchmaking(): void {
    if (!this.socket?.connected) {
      console.warn('Cannot cancel matchmaking: Socket not connected');
      return;
    }
    this.socket.emit('matchmaking:cancel');
  }

  // Restore room management methods
  createRoom(roomConfig: {
    name: string;
    isPrivate: boolean;
    password?: string;
    gameMode: 'ffa' | 'teams' | 'battle-royale';
    maxPlayers: number;
  }): void {
    if (!this.socket?.connected) {
      console.warn('Cannot create room: Socket not connected');
      return;
    }
    
    const roomId = `room-${Date.now()}`;
    this.socket.emit('room:create', {
      ...roomConfig,
      id: roomId,
      players: [],
      teams: roomConfig.gameMode === 'teams' ? [] : undefined
    });
  }

  joinRoom(roomId: string, password?: string): void {
    if (!this.socket?.connected) {
      console.warn('Cannot join room: Socket not connected');
      return;
    }
    this.socket.emit('room:join', { roomId, password });
  }

  // Basic socket methods
  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`Attempted to emit '${event}' but socket is not connected`);
    }
  }

  on<T = any>(event: string, callback: (data: T) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    } else {
      console.warn(`Attempted to add listener for '${event}' but socket is not initialized`);
    }
  }

  off<T = any>(event: string, callback?: (data: T) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = SocketService.getInstance();