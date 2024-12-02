import { create } from 'zustand';
import { Socket } from 'socket.io-client';
import { PowerUpType, PowerUpCombo, POWER_UP_COMBOS } from '../types/powerups';
import { CONFIG } from '../constants/gameConfig';
import { Blob, Position, GameState } from '../types/common';
import { soundService } from '../services/soundService';
import { Room, GameMode } from '../types/game';

interface MatchmakingState {
  isSearching: boolean;
  status: string;
  preferences?: {
    gameMode: GameMode;
    region: string;
  };
}

interface ActiveCombo extends PowerUpCombo {
  id: string;
  playerId: string;
  startTime: number;
}

interface GameStore extends GameState {
  socket: Socket | null;
  player: Blob | null;
  mousePosition: Position;
  zoom: number;
  activeCombos: ActiveCombo[];
  activePowerUps: Array<{id: string; type: string; expiresAt: number}>;
  blobs: Array<Blob>;
  viewport: {x: number; y: number; scale: number};
  isConnected: boolean;
  matchmaking: MatchmakingState;
  rooms: Map<string, Room>;
  gameStarted: boolean;
  gameResults: any | null;
  
  // Actions
  setSocket: (socket: Socket) => void;
  setPlayer: (player: Blob) => void;
  setMousePosition: (position: Position) => void;
  setZoom: (zoom: number) => void;
  updatePlayer: (updates: Partial<Blob>) => void;
  handlePowerUpCollect: (powerUpId: string, playerId: string, type: PowerUpType) => void;
  handleComboActivation: (data: { playerId: string; types: PowerUpType[] }) => void;
  initializePlayer: (playerData: Partial<Blob>) => void;
  startGame: () => void;
  joinRoom: (roomId: string) => void;
  addNotification: (message: string) => void;
  splitBlob: () => void;
  ejectMass: () => void;
  createRoom: (roomConfig: Partial<Room>) => void;
  leaveRoom: () => void;
  activatePowerUp: (id: string) => void;
  setBoost: (active: boolean) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  socket: null,
  player: null,
  players: new Map(),
  food: new Map(),
  powerUps: new Map(),
  obstacles: new Map(),
  teams: new Map(),
  leaderboard: [],
  mousePosition: { x: 0, y: 0 },
  zoom: 1,
  worldSize: CONFIG.game.worldSize,
  gameMode: 'ffa',
  activeCombos: [],
  activePowerUps: [],
  blobs: [],
  viewport: { x: 0, y: 0, scale: 1 },
  isConnected: false,
  matchmaking: {
    isSearching: false,
    status: 'idle'
  },
  rooms: new Map(),
  gameStarted: false,
  gameResults: null,

  // Actions
  setSocket: (socket) => set({ socket }),
  setPlayer: (player) => set({ player }),
  setMousePosition: (position) => set({ mousePosition: position }),
  setZoom: (zoom) => set({ zoom }),
  
  updatePlayer: (updates) => {
    const { player } = get();
    if (!player) return;
    
    set({
      player: { ...player, ...updates },
      players: new Map(get().players).set(player.id, { ...player, ...updates })
    });
  },

  handlePowerUpCollect: (powerUpId, playerId, type) => {
    const { player, powerUps } = get();
    const powerUp = powerUps.get(powerUpId);
    
    if (!powerUp) return;

    const newPowerUps = new Map(powerUps);
    newPowerUps.delete(powerUpId);
    
    if (player?.id === playerId) {
      soundService.play('powerup-collect');
    }

    set(state => ({
      powerUps: newPowerUps,
      players: new Map(state.players).set(playerId, {
        ...state.players.get(playerId)!,
        activePowerUps: [
          ...(state.players.get(playerId)?.activePowerUps || []),
          {
            type,
            startTime: Date.now(),
            duration: CONFIG.powerUps.effectDurations[type]
          }
        ]
      })
    }));
  },

  handleComboActivation: (data) => {
    const combo = Object.values(POWER_UP_COMBOS).find(c => 
      c.types.length === data.types.length && 
      c.types.every(t => data.types.includes(t))
    );

    if (combo) {
      const activeCombo = {
        ...combo,
        id: `combo-${Date.now()}`,
        playerId: data.playerId,
        startTime: Date.now()
      };

      set(state => ({
        activeCombos: [...state.activeCombos, activeCombo]
      }));

      soundService.play('combo-activate');
    }
  },

  initializePlayer: (playerData) => {
    const { socket } = get();
    if (socket) {
      socket.emit('initialize-player', playerData);
    }
  },

  startGame: () => {
    const { socket } = get();
    if (socket) {
      socket.emit('start-game');
    }
  },

  joinRoom: (roomId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('join-room', { roomId });
    }
  },

  addNotification: (message) => {
    console.log('Notification:', message);
  },

  splitBlob: () => {
    const { socket } = get();
    if (socket) {
      socket.emit('split');
    }
  },

  ejectMass: () => {
    const { socket } = get();
    if (socket) {
      socket.emit('eject-mass');
    }
  },

  createRoom: (roomConfig) => {
    const { socket } = get();
    if (socket) {
      socket.emit('create-room', roomConfig);
      
      // Optimistically add room to local state
      set(state => ({
        rooms: new Map(state.rooms).set(roomConfig.id!, roomConfig as Room)
      }));
    }
  },

  leaveRoom: () => {
    const { socket } = get();
    if (socket) {
      socket.emit('leave-room');
    }
  },

  activatePowerUp: (id: string) => {
    const { socket } = get();
    if (socket) {
      socket.emit('activate-powerup', { id });
    }
  },

  setBoost: (active: boolean) => {
    const { socket } = get();
    if (socket) {
      socket.emit('boost', { active });
    }
  }
}));