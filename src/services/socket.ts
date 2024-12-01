import { io, Socket } from 'socket.io-client';
import { PowerUp, PowerUpType } from '../types/powerups';
import { useGameStore } from '../store/gameStore';
import { soundService } from '../services/soundService';
import { POWER_UP_CONFIG } from '../store/gameStore';
import { LeaderboardEntry, LeaderboardUpdate, ComboStats } from '../types/leaderboard';
import { MatchPreferences } from '../types/matchmaking';

const SOCKET_URL = 'http://localhost:3001';

interface MatchmakingPreferences {
  gameMode: 'ffa' | 'teams' | 'battle-royale';
  region?: string;
  skillLevel: number;
}

export class SocketService {
  private static instance: SocketService | null = null;
  private socket: Socket | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public async initSocket(): Promise<Socket> {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.socket = io(SOCKET_URL, {
      reconnectionDelayMax: 10000,
      withCredentials: true,
    });

    // Core game state handlers
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
        blobs: gameState.players || [],
        food: new Map(gameState.food || []),
        powerUps: gameState.powerUps || [],
        leaderboard: gameState.leaderboard || []
      });
    });

    // Matchmaking handlers
    this.socket.on('matchmaking:status', (status: string) => {
      useGameStore.setState(state => ({
        matchmaking: {
          ...state.matchmaking,
          status
        }
      }));
    });

    this.socket.on('matchmaking:found', (gameId: string) => {
      useGameStore.setState(state => ({
        matchmaking: {
          ...state.matchmaking,
          isSearching: false,
          status: 'found'
        }
      }));
      this.emit('game:join', { gameId });
    });

    // Player update handlers
    this.socket.on('player:updated', (update) => {
      const state = useGameStore.getState();
      if (state.player?.id !== update.id) {
        state.updatePlayerPosition(
          update.id,
          update.position,
          1/60 // Default delta time
        );
      }
    });

    // Power-up handlers
    this.socket.on('powerup:spawn', (powerUp: PowerUp) => {
      useGameStore.setState(state => ({
        powerUps: Array.isArray(state.powerUps) ? [...state.powerUps, powerUp] : [powerUp]
      }));
    });

    this.socket.on('powerup:collected', ({ powerUpId, playerId }) => {
      useGameStore.setState(state => ({
        powerUps: state.powerUps.filter(p => p.id !== powerUpId)
      }));
      
      if (useGameStore.getState().player?.id === playerId) {
        soundService.play('powerup-collect');
      }
    });

    this.socket.on('powerup:activated', (data: {
      powerUpId: string;
      playerId: string;
      type: PowerUpType;
    }) => {
      const state = useGameStore.getState();
      const powerUp = state.powerUps.find(p => p.id === data.powerUpId);
      if (!powerUp) return;

      useGameStore.setState(state => ({
        activePowerUps: [...state.activePowerUps, {
          ...powerUp,
          playerId: data.playerId,
          expiresAt: Date.now() + POWER_UP_CONFIG.DURATIONS[data.type]
        }]
      }));
    });

    return this.socket;
  }

  // Simplified power-up handlers
  public initializePowerUpHandlers(): void {
    if (!this.socket) return;

    this.socket.on('powerup:spawn', (powerUp: PowerUp) => {
      useGameStore.setState(state => ({
        powerUps: Array.isArray(state.powerUps) ? [...state.powerUps, powerUp] : [powerUp]
      }));
    });

    this.socket.on('powerup:collected', ({ powerUpId, playerId }) => {
      useGameStore.setState(state => ({
        powerUps: state.powerUps.filter(p => p.id !== powerUpId)
      }));
      
      if (useGameStore.getState().player?.id === playerId) {
        soundService.play('powerup-collect');
      }
    });
  }

  // Clean up leaderboard handlers
  public initializeLeaderboardHandlers(): void {
    if (!this.socket) return;

    this.socket.on('leaderboard:update', (leaderboard) => {
      useGameStore.setState({ leaderboard });
    });
  }

  // Basic emit wrapper
  public emit<T = any>(event: string, data: T): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`Attempted to emit '${event}' but socket is not connected`);
    }
  }

  public dispose(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    SocketService.instance = null;
  }

  public on<T = any>(event: string, callback: (data: T) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    } else {
      console.warn(`Attempted to add listener for '${event}' but socket is not initialized`);
    }
  }

  public off<T = any>(event: string, callback?: (data: T) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  public collectPowerUp(powerUpId: string): void {
    const state = useGameStore.getState();
    if (!this.socket || !state.player) {
      console.warn('Cannot collect power-up: No socket or player');
      return;
    }

    this.socket.emit('powerup:collect', {
      powerUpId,
      playerId: state.player.id
    });
  }

  public setupMatchmakingListeners(callbacks: {
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

  public findMatch(preferences: MatchmakingPreferences): void {
    if (!this.socket?.connected) {
      console.warn('Cannot find match: Socket not connected');
      return;
    }
    this.socket.emit('matchmaking:start', preferences);
  }

  public cancelMatchmaking(): void {
    if (!this.socket?.connected) {
      console.warn('Cannot cancel matchmaking: Socket not connected');
      return;
    }
    this.socket.emit('matchmaking:cancel');
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public createRoom(roomConfig: {
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

  public joinRoom(roomId: string, password?: string): void {
    if (!this.socket?.connected) {
      console.warn('Cannot join room: Socket not connected');
      return;
    }
    this.socket.emit('room:join', { roomId, password });
  }
}

export const socketService = SocketService.getInstance();