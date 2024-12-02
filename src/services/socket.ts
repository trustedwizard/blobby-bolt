import io, { Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';
import { PowerUpType } from '../types/powerups';
import { Player, Room } from '../types/game';

interface MatchmakingPreferences {
  gameMode: 'ffa' | 'teams' | 'battle-royale';
  region?: string;
  skillLevel: number;
}

export class SocketService {
  private socket: Socket | null = null;
  private static instance: SocketService;
  private isInitializing: boolean = false;
  private initializationPromise: Promise<void> | null = null;

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

  async connect(serverUrl: string = 'http://localhost:3001'): Promise<void> {
    if (this.socket?.connected) return;
    if (this.isInitializing && this.initializationPromise) return this.initializationPromise;

    this.isInitializing = true;
    this.initializationPromise = new Promise((resolve, reject) => {
      try {
        if (this.socket) {
          this.socket.close();
          this.socket = null;
        }

        console.log('Attempting to connect to server:', serverUrl);
        
        this.socket = io(serverUrl, {
          transports: ['polling', 'websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
          autoConnect: true,
          path: '/socket.io'
        });

        this.socket.on('connect', () => {
          console.log('Connected to server');
          useGameStore.setState({ isConnected: true });
          this.setupEventHandlers();
          this.isInitializing = false;
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          useGameStore.setState({ isConnected: false });
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Disconnected from server:', reason);
          useGameStore.setState({ isConnected: false });
          if (reason === 'io server disconnect') {
            // Server initiated disconnect, try to reconnect
            this.socket?.connect();
          }
        });

        this.socket.on('reconnect', (attemptNumber) => {
          console.log('Reconnected to server after', attemptNumber, 'attempts');
          useGameStore.setState({ isConnected: true });
        });

        this.socket.on('reconnect_attempt', (attemptNumber) => {
          console.log('Attempting to reconnect:', attemptNumber);
        });

        this.socket.on('reconnect_error', (error) => {
          console.error('Reconnection error:', error);
        });

        this.socket.on('reconnect_failed', () => {
          console.error('Failed to reconnect');
          this.isInitializing = false;
          reject(new Error('Failed to reconnect to server'));
        });

        // Add connection timeout
        const timeoutId = setTimeout(() => {
          if (!this.socket?.connected) {
            console.error('Connection timeout');
            this.socket?.close();
            this.isInitializing = false;
            reject(new Error('Connection timeout'));
          }
        }, 20000);

        // Clear timeout if connected
        this.socket.on('connect', () => {
          clearTimeout(timeoutId);
        });

      } catch (error) {
        console.error('Socket initialization error:', error);
        this.isInitializing = false;
        reject(error);
      }
    });

    return this.initializationPromise;
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Remove any existing listeners
    this.socket.removeAllListeners();

    this.socket.on('connect', () => {
      console.log('Connected to server');
      useGameStore.setState({ isConnected: true });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      useGameStore.setState({ isConnected: false });
    });

    // Room event handlers
    this.socket.on('room:created', (room: Room) => {
      console.log('Room created:', room);
      useGameStore.setState(state => {
        const rooms = new Map(state.rooms);
        rooms.set(room.id, room);
        return { rooms };
      });
    });

    this.socket.on('room:removed', ({ roomId }: { roomId: string }) => {
      const rooms = new Map(useGameStore.getState().rooms);
      rooms.delete(roomId);
      useGameStore.setState({ rooms });
    });

    this.socket.on('room:player:joined', ({ roomId, playerId, player }: { roomId: string; playerId: string; player: Player }) => {
      const rooms = new Map(useGameStore.getState().rooms);
      const room = rooms.get(roomId);
      if (room) {
        room.players.set(playerId, player);
        useGameStore.setState({ rooms });
      }
    });

    this.socket.on('room:player:left', ({ roomId, playerId }: { roomId: string; playerId: string }) => {
      const rooms = new Map(useGameStore.getState().rooms);
      const room = rooms.get(roomId);
      if (room) {
        room.players.delete(playerId);
        useGameStore.setState({ rooms });
      }
    });

    // Game state handlers
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

    // Game events
    this.socket.on('game:start', () => {
      useGameStore.setState({ gameStarted: true });
    });

    this.socket.on('game:end', (results) => {
      useGameStore.setState({ 
        gameStarted: false,
        gameResults: results
      });
    });

    // Error handlers
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      useGameStore.getState().addNotification(`Error: ${error.message}`);
    });

    // Disconnection handler
    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      useGameStore.setState({ isConnected: false });
    });
  }

  // Matchmaking methods
  async setupMatchmakingListeners(callbacks: {
    onMatchFound: (gameId: string) => void;
    onMatchmakingStatus: (status: string) => void;
    onMatchmakingError: (error: string) => void;
  }): Promise<void> {
    if (!this.socket) {
      if (!this.isInitializing) {
        await this.connect();
      } else {
        await this.initializationPromise;
      }
    }

    if (!this.socket) {
      throw new Error('Failed to initialize socket connection');
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

  // Room management methods
  async createRoom(roomConfig: {
    name: string;
    isPrivate: boolean;
    password?: string;
    gameMode: 'ffa' | 'teams' | 'battle-royale';
    maxPlayers: number;
  }): Promise<void> {
    try {
      if (!this.socket?.connected) {
        if (!this.isInitializing) {
          await this.connect();
        } else {
          await this.initializationPromise;
        }
      }

      if (!this.socket?.connected) {
        throw new Error('Failed to establish socket connection');
      }
      
      const roomId = `room-${Date.now()}`;
      this.socket.emit('room:create', {
        ...roomConfig,
        id: roomId,
        players: [],
        teams: roomConfig.gameMode === 'teams' ? [] : undefined
      });
    } catch (error) {
      console.error('Failed to create room:', error);
      useGameStore.getState().addNotification('Failed to create room. Please try again.');
      throw error;
    }
  }

  async joinRoom(roomId: string, password?: string): Promise<void> {
    try {
      if (!this.socket?.connected) {
        if (!this.isInitializing) {
          await this.connect();
        } else {
          await this.initializationPromise;
        }
      }

      if (!this.socket?.connected) {
        throw new Error('Failed to establish socket connection');
      }

      this.socket.emit('room:join', { roomId, password });
    } catch (error) {
      console.error('Failed to join room:', error);
      useGameStore.getState().addNotification('Failed to join room. Please try again.');
      throw error;
    }
  }

  // Basic socket methods with auto-connect
  async emit(event: string, data?: any): Promise<void> {
    if (!this.socket?.connected) {
      if (!this.isInitializing) {
        await this.connect();
      } else {
        await this.initializationPromise;
      }
    }

    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      throw new Error(`Failed to emit '${event}': Socket not connected`);
    }
  }

  async on<T = any>(event: string, callback: (data: T) => void): Promise<void> {
    if (!this.socket) {
      if (!this.isInitializing) {
        await this.connect();
      } else {
        await this.initializationPromise;
      }
    }

    if (this.socket) {
      this.socket.on(event, callback);
    } else {
      throw new Error(`Failed to add listener for '${event}': Socket not initialized`);
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