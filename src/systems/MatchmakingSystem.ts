import { Socket } from 'socket.io-client';
import { BaseSystem } from './BaseSystem';

interface MatchmakingPreferences {
  skillRating: number;
  preferredRegions: string[];
  gamePreferences: {
    mode: 'ffa' | 'teams' | 'battle-royale';
    teamSize?: number;
    maxPlayers?: number;
  };
}

export class MatchmakingSystem extends BaseSystem {
  private socket: Socket | null = null;

  public static getInstance(): MatchmakingSystem {
    if (!MatchmakingSystem.instance) {
      MatchmakingSystem.instance = new MatchmakingSystem();
    }
    return MatchmakingSystem.instance as MatchmakingSystem;
  }

  public setSocket(socket: Socket) {
    this.socket = socket;
  }

  public findMatch(preferences: MatchmakingPreferences) {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }
    try {
      this.socket.emit('matchmaking:find', preferences);
    } catch (error) {
      console.error('Matchmaking error:', error);
      throw error;
    }
  }

  public cancelMatchmaking() {
    if (!this.socket) return;
    this.socket.emit('matchmaking:cancel');
  }

  public setupListeners(callbacks: {
    onMatchFound: (gameId: string) => void;
    onMatchmakingStatus: (status: string) => void;
    onMatchmakingError: (error: string) => void;
  }) {
    if (!this.socket) return;

    this.socket.on('matchmaking:found', callbacks.onMatchFound);
    this.socket.on('matchmaking:status', callbacks.onMatchmakingStatus);
    this.socket.on('matchmaking:error', callbacks.onMatchmakingError);
  }

  protected cleanupResources(): void {
    if (this.socket) {
      this.socket.off('matchmaking:found');
      this.socket.off('matchmaking:status');
      this.socket.off('matchmaking:error');
      this.socket = null;
    }
  }
}

export const matchmakingSystem = MatchmakingSystem.getInstance(); 