import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Socket } from 'socket.io-client';
import { socketService } from '../services/socket';
import { PowerUp, ActivePowerUp, PowerUpType, PowerUpCombo, POWER_UP_COMBOS } from '../types/powerups';
import { soundService } from '../services/soundService';
import { Position } from '../types/common';
import * as PIXI from 'pixi.js';
import { MatchmakingSystem } from '../systems/MatchmakingSystem';

export const POWER_UP_CONFIG = {
  DESPAWN_TIME: 30000, // 30 seconds
  MAX_ACTIVE_POWERUPS: 10,
  SPAWN_INTERVAL: 5000, // 5 seconds
  MIN_DISTANCE_FROM_PLAYERS: 100,
  DURATIONS: {
    [PowerUpType.SPEED_BOOST]: 10000,
    [PowerUpType.SHIELD]: 8000,
    [PowerUpType.BLOB_MAGNET]: 15000,
    [PowerUpType.GRAVITY_PULSE]: 0,
    [PowerUpType.TELEPORT]: 0,
    [PowerUpType.SPLIT_BOMB]: 0,
  }
};

export type { GameState, Room, Team, GameInstance, LeaderboardEntry };

interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface World {
  width: number;
  height: number;
}

interface Blob {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: number;
  name: string;
  emoji: string;
  trail: Position[];
  score: number;
  teamId?: string;
  lastCollisionTime?: number;
  splitVelocity?: { x: number; y: number };
  canMerge?: boolean;
  parentId?: string;
  lastSplitTime?: number;
  lastEjectTime?: number;
  splitAnimation?: {
    startTime: number;
    duration: number;
    startRadius: number;
    endRadius: number;
    startPosition: Position;
    endPosition: Position;
  };
  pendingX?: number;
  pendingY?: number;
  pendingRemoval?: boolean;
  velocity?: {
    x: number;
    y: number;
  };
}

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  wins: number;
}

interface Room {
  id: string;
  name: string;
  isPrivate: boolean;
  password?: string;
  gameMode: 'ffa' | 'teams' | 'battle-royale';
  maxPlayers: number;
  players: string[];
  teams: Team[];
}

interface Food {
  id: string;
  x: number;
  y: number;
  color: number;
  size: number;
  type: 'normal' | 'power' | 'ejected';
  spawnTime: number;
  splitVelocity?: { x: number; y: number };
  pendingRemoval?: boolean;
}

interface MatchmakingState {
  isSearching: boolean;
  status: string;
  region?: string;
  gameMode: 'ffa' | 'teams' | 'battle-royale';
  skillLevel: number;
}

interface PowerUpState {
  powerUps: PowerUp[];
  activePowerUps: ActivePowerUp[];
  activeCombos: PowerUpCombo[];
}

interface GameState extends PowerUpState {
  world: World;
  viewport: Viewport;
  player: Blob | null;
  blobs: Blob[];
  gameStarted: boolean;
  isConnected: boolean;
  notifications: { id: string; message: string; timestamp: number; }[];
  leaderboard: LeaderboardEntry[];
  mousePosition: Position | null;
  setMousePosition: (position: Position | null) => void;
  initializePlayer: (playerData: Blob) => void;
  updatePlayerPosition: (screenX: number, screenY: number, delta: number) => void;
  startGame: () => void;
  addNotification: (message: string) => void;
  setViewport: (viewport: Viewport) => void;
  worldToScreen: (worldX: number, worldY: number) => Position;
  spawnFood: (count: number) => void;
  checkCollisions: () => void;
  rooms: Room[];
  joinRoom: (roomId: string) => void;
  currentRoom: Room | null;
  joinTeam: (teamId: string) => void;
  createRoom: (room: Room) => void;
  maxPlayersPerRoom: number;
  activeGames: Map<string, GameInstance>;
  findAvailableGame: () => string;
  handleRoomFull: () => void;
  splitBlob: () => void;
  mergeBlobs: (blob1: Blob, blob2: Blob) => void;
  updateSplitBlobs: (delta: number) => void;
  ejectMass: () => void;
  getSplitCooldown: () => number;
  getEjectCooldown: () => number;
  food: Map<string, Food>;
  matchmaking: MatchmakingState;
  setMatchmakingState: (state: Partial<MatchmakingState>) => void;
  powerUps: PowerUp[];
  activePowerUps: ActivePowerUp[];
  activatePowerUp: (powerUpId: string) => void;
  activeCombos: PowerUpCombo[];
  checkAndActivateCombo: () => void;
  pixiApp: PIXI.Application | null;
  setPixiApp: (app: PIXI.Application) => void;
  socket: Socket | null;
  setSocket: (socket: Socket) => void;
  disconnectSocket: () => void;
  reconnectSocket: () => void;
  teams: Team[];
  currentTeam: Team | null;
  teamScore: number;
  leaveTeam: () => void;
  updateTeamScore: (score: number) => void;
  handleTeamCollision: (team1Id: string, team2Id: string) => void;
  getTeamSpawnPoint: (teamId: string) => Position;
  syncTeamScore: (teamId: string, score: number) => void;
  updateBlobPosition: (blobId: string, x: number, y: number) => void;
  setLocalPlayer: (player: Blob) => void;
  camera: {
    zoom: number;
    targetZoom: number;
    position: Position;
    bounds: {
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
    };
  };
  updateCamera: () => void;
  setZoom: (zoom: number) => void;
  startMatchmaking: () => void;
  collectPowerUp: (powerUpId: string) => void;
}

interface GameInstance {
  id: string;
  players: Set<string>;
  gameMode: 'ffa' | 'teams' | 'battle-royale';
  maxPlayers: number;
  startTime: number;
}

interface Team {
  id: string;
  name: string;
  color: number;
  players: string[];
  score: number;
}

const WORLD_SIZE = 4000;
const MAX_TRAIL_LENGTH = 20;
const SPLIT_COOLDOWN = 1000;
const EJECT_MASS_COOLDOWN = 500;
const MIN_SPLIT_RADIUS = 25;
const EJECT_MASS_SIZE = 10;
const EJECT_MASS_SPEED = 15;
const EJECT_MASS_LOSS = 20;
const MERGE_DISTANCE = 50;
const SPLIT_VELOCITY = 15;

// Initialize matchmaking system
const matchmakingSystem = MatchmakingSystem.getInstance();

export const useGameStore = create(
  subscribeWithSelector<GameState>((set, get) => {
    // Move socket listeners into an init function
    const initSocketListeners = () => {
      socketService.on('rooms:updated', (updatedRooms: Room[]) => {
        set(() => ({ rooms: updatedRooms }));
      });

      socketService.on('room:joined', (room: Room) => {
        set(() => ({ currentRoom: room }));
      });

      socketService.on('room:join:error', (error: string) => {
        set(state => ({
          notifications: [...state.notifications, {
            id: `notification-${Date.now()}`,
            message: error,
            timestamp: Date.now()
          }]
        }));
      });

      socketService.on('game:state', (gameState: { 
        players: Blob[],
        leaderboard: LeaderboardEntry[]
      }) => {
        set(() => ({
          blobs: gameState.players,
          leaderboard: gameState.leaderboard
        }));
      });

      socketService.on('player:joined', (player: Blob) => {
        set(state => ({
          blobs: [...state.blobs, player],
          notifications: [...state.notifications, {
            id: `notification-${Date.now()}`,
            message: `${player.name} joined the game!`,
            timestamp: Date.now()
          }]
        }));
      });

      socketService.on('player:left', (playerId: string) => {
        set((state) => ({
          blobs: state.blobs.filter(b => b.id !== playerId),
          notifications: [...state.notifications, {
            id: `notification-${Date.now()}`,
            message: `A player left the game`,
            timestamp: Date.now()
          }]
        }));
      });

      socketService.on('player:updated', (player: Blob) => {
        set((state) => ({
          blobs: state.blobs.map(b => b.id === player.id ? player : b)
        }));
      });

      socketService.on('food:state', (foodState: Food[]) => {
        set(() => {
          const foodMap = new Map();
          foodState.forEach(food => foodMap.set(food.id, food));
          return { food: foodMap };
        });
      });

      socketService.on('food:added', (newFood: Food | Food[]) => {
        set(state => {
          const foodMap = new Map(state.food);
          if (Array.isArray(newFood)) {
            newFood.forEach(f => foodMap.set(f.id, f));
          } else {
            foodMap.set(newFood.id, newFood);
          }
          return { food: foodMap };
        });
      });

      socketService.on('food:removed', (foodId: string) => {
        set(state => {
          const foodMap = new Map(state.food);
          foodMap.delete(foodId);
          return { food: foodMap };
        });
      });

      // Add collision event handlers
      socketService.on('collision:effect', (effect) => {
        // Only use what we need
        const { type } = effect;  // Remove position and size from destructuring
        switch (type) {
          case 'eat':
            soundService.play('eat');
            break;
          case 'merge':
            soundService.play('merge');
            break;
          case 'split':
            soundService.play('split');
            break;
        }
      });

      socketService.on('blob:grow', (data) => {
        // Only use what we need
        const { blobId } = data;  // Remove amount from destructuring
        const blob = get().blobs.find(b => b.id === blobId);
        if (blob) {
          soundService.play('grow');
        }
      });

      socketService.on('powerup:effect', (effect) => {
        // Handle powerup effects
        const { type, playerId } = effect;
        const blob = get().blobs.find(b => b.id === playerId);
        if (blob) {
          switch (type) {
            case PowerUpType.SHIELD:
              soundService.play('shield-hit');
              break;
            case PowerUpType.SPEED_BOOST:
              soundService.play('speed-boost');
              break;
            case PowerUpType.BLOB_MAGNET:
              soundService.play('magnet-active');
              break;
            case PowerUpType.GRAVITY_PULSE:
              soundService.play('gravity-pulse');
              break;
            case PowerUpType.TELEPORT:
              soundService.play('teleport');
              break;
            case PowerUpType.SPLIT_BOMB:
              soundService.play('split-bomb');
              break;
          }
        }
      });

      // Add these socket handlers to properly integrate with server matchmaker
      socketService.on('matchmaking:status', (status: string) => {
        set(state => ({
          matchmaking: {
            ...state.matchmaking,
            status
          }
        }));
      });

      socketService.on('matchmaking:found', (gameId: string) => {
        set(state => ({
          matchmaking: {
            ...state.matchmaking,
            isSearching: false,
            status: 'found'
          }
        }));
        // Join the found game
        socketService.emit('game:join', { gameId });
      });

      // Add power-up related socket listeners
      socketService.on('powerup:spawn', (powerUp: PowerUp) => {
        set(state => ({
          powerUps: [...state.powerUps, powerUp]
        }));
      });

      socketService.on('powerup:collected', ({ powerUpId }) => {
        set(state => ({
          powerUps: state.powerUps.filter(p => p.id !== powerUpId)
        }));
      });

      socketService.on('powerup:activated', (data: {
        powerUpId: string;
        playerId: string;
        type: PowerUpType;
      }) => {
        const powerUp = get().powerUps.find(p => p.id === data.powerUpId);
        if (!powerUp) return;

        set(state => ({
          activePowerUps: [...state.activePowerUps, {
            ...powerUp,
            playerId: data.playerId,
            expiresAt: Date.now() + POWER_UP_CONFIG.DURATIONS[data.type]
          }]
        }));
      });

      socketService.on('powerup:combo:activated', (data: {
        playerId: string;
        comboName: string;
        types: PowerUpType[];
      }) => {
        set(state => ({
          activeCombos: [...state.activeCombos, {
            id: `combo-${Date.now()}`,
            playerId: data.playerId,
            types: data.types,
            startTime: Date.now(),
            duration: 15000 // 15 seconds for combos
          }]
        }));
      });
    };

    // Call init function
    initSocketListeners();

    return {
      world: {
        width: WORLD_SIZE,
        height: WORLD_SIZE,
      },
      viewport: {
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      },
      player: null,
      blobs: [],
      gameStarted: false,
      isConnected: false,
      notifications: [],
      leaderboard: [],
      mousePosition: null,
      rooms: [],
      joinRoom: (roomId: string) => {
        socketService.emit('room:join', { roomId });
      },
      createRoom: (room: Room) => {
        socketService.emit('room:create', room);
      },
      currentRoom: null,
      joinTeam: (teamId: string) => {
        const room = get().currentRoom;
        if (!room) return;

        socketService.emit('team:join', {
          roomId: room.id,
          teamId
        });
      },

      initializePlayer: (playerData: Blob) => {
        set({ player: playerData });
        socketService.emit('player:join', playerData);
      },

      startGame: () => {
        set({ gameStarted: true });
      },

      updatePlayerPosition: (screenX: number, screenY: number, delta: number) => {
        set(state => {
          if (!state.player) return state;

          // Convert screen coordinates to world direction vector
          const centerX = window.innerWidth / 2;
          const centerY = window.innerHeight / 2;
          
          // Calculate direction from screen center
          const dx = screenX - centerX;
          const dy = screenY - centerY;
          const distance = Math.hypot(dx, dy);

          // Only move if mouse is far enough from center
          if (distance < 5) return state;

          // Calculate speed based on size with better scaling
          const baseSpeed = 10;
          const minSpeed = 3;
          const maxRadius = 200;
          const speedReduction = (state.player.radius / maxRadius) * (baseSpeed - minSpeed);
          const speed = Math.max(minSpeed, baseSpeed - speedReduction);

          // Normalize direction and apply speed
          const normalizedDx = dx / distance;
          const normalizedDy = dy / distance;
          
          // Calculate new position with momentum
          const momentum = 0.85;
          const lastVelocity = state.player.velocity || { x: 0, y: 0 };
          
          const newVx = normalizedDx * speed;
          const newVy = normalizedDy * speed;
          
          // Apply momentum with speed limit
          const maxSpeed = speed * 1.5;
          const finalVx = Math.min(Math.max(lastVelocity.x * momentum + newVx * (1 - momentum), -maxSpeed), maxSpeed);
          const finalVy = Math.min(Math.max(lastVelocity.y * momentum + newVy * (1 - momentum), -maxSpeed), maxSpeed);

          // Calculate new position with world bounds
          const newX = Math.max(0, Math.min(WORLD_SIZE, state.player.x + finalVx * delta));
          const newY = Math.max(0, Math.min(WORLD_SIZE, state.player.y + finalVy * delta));

          // Update trail with new position
          const newTrail = [
            { x: newX, y: newY },
            ...state.player.trail.slice(0, MAX_TRAIL_LENGTH - 1)
          ];

          // Update player state
          const updatedPlayer = {
            ...state.player,
            x: newX,
            y: newY,
            velocity: { x: finalVx, y: finalVy },
            trail: newTrail
          };

          // Update viewport to center on player
          const newViewport = {
            ...state.viewport,
            x: newX - window.innerWidth / 2,
            y: newY - window.innerHeight / 2
          };

          // Emit position update to server
          state.socket?.emit('player:move', {
            x: newX,
            y: newY,
            velocity: { x: finalVx, y: finalVy }
          });

          return {
            player: updatedPlayer,
            viewport: newViewport,
            blobs: state.blobs.map(b => 
              b.id === updatedPlayer.id ? updatedPlayer : b
            )
          };
        });
      },

      addNotification: (message: string) => {
        set((state) => ({
          notifications: [
            ...state.notifications,
            {
              id: `notification-${Date.now()}`,
              message,
              timestamp: Date.now(),
            }
          ].slice(-5)
        }));
      },

      setViewport: (viewport: Viewport) => {
        set({ viewport });
      },

      worldToScreen: (worldX: number, worldY: number) => {
        const state = get();
        return {
          x: worldX - state.viewport.x,
          y: worldY - state.viewport.y,
        };
      },

      spawnFood: (count: number) => {
        socketService.emit('food:spawn', count);
      },

      checkCollisions: () => {
        const state = get();
        if (!state.player) return;

        // Check food collisions
        for (const food of state.food.values()) {
          const distance = Math.hypot(food.x - state.player.x, food.y - state.player.y);
          if (distance < state.player.radius + food.size) {
            socketService.emit('food:eaten', food.id);
          }
        }

        // Check blob collisions
        state.blobs.forEach((blob) => {
          if (blob.id === state.player!.id) return; // Don't collide with self
          
          const distance = Math.hypot(blob.x - state.player!.x, blob.y - state.player!.y);
          if (distance < Math.max(state.player!.radius, blob.radius)) {
            if (state.player!.radius > blob.radius * 1.1) {
              socketService.emit('player:eaten', blob.id);
            }
          }
        });

        // Check power-up collisions
        state.powerUps.forEach(powerUp => {
          const distance = Math.hypot(
            powerUp.position.x - state.player!.x,
            powerUp.position.y - state.player!.y
          );

          if (distance < state.player!.radius) {
            socketService.collectPowerUp(powerUp.id);
            soundService.play('powerup-collect');
          }
        });
      },

      maxPlayersPerRoom: 50,
      activeGames: new Map<string, GameInstance>(),
      findAvailableGame: () => {
        const state = get();
        const { gameMode, skillLevel, region } = state.matchmaking;
        
        // Find games that match criteria
        const availableGames = Array.from(state.activeGames.values()).filter(game => {
          // Check if game matches requirements
          return game.gameMode === gameMode && 
                 game.players.size < game.maxPlayers &&
                 // Add timestamp check to avoid joining very old games
                 Date.now() - game.startTime < 5 * 60 * 1000; // 5 minutes max
        });

        if (availableGames.length > 0) {
          // Sort by number of players (prefer fuller games)
          availableGames.sort((a, b) => b.players.size - a.players.size);
          return availableGames[0].id;
        }

        // Create new game if none available
        const newGameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newGame: GameInstance = {
          id: newGameId,
          players: new Set(),
          gameMode,
          maxPlayers: state.maxPlayersPerRoom,
          startTime: Date.now()
        };

        state.activeGames.set(newGameId, newGame);
        
        // Emit new game creation to server
        state.socket?.emit('game:create', {
          gameId: newGameId,
          gameMode,
          region,
          skillLevel
        });

        return newGameId;
      },
      handleRoomFull: () => {
        const state = get();
        
        // Notify user
        state.addNotification('Room is full, finding new room...');
        
        // Try to find another game
        const newGameId = state.findAvailableGame();
        
        if (newGameId) {
          // Join new game
          state.socket?.emit('game:join', {
            gameId: newGameId,
            playerId: state.player?.id
          });
        } else {
          // Handle failure case
          state.addNotification('Unable to find available room. Please try again later.');
          state.setMatchmakingState({
            isSearching: false,
            status: 'error'
          });
        }
      },
      splitBlob: () => {
        set(state => {
          if (!state.player || !state.mousePosition) return state;
          
          const now = Date.now();
          if (now - (state.player.lastSplitTime || 0) < SPLIT_COOLDOWN) return state;
          if (state.player.radius < MIN_SPLIT_RADIUS * 2) return state;

          // Calculate split direction based on mouse position
          const angle = Math.atan2(
            state.mousePosition.y - state.player.y,
            state.mousePosition.x - state.player.x
          );

          // Create two new blobs
          const newRadius = state.player.radius / Math.sqrt(2);
          const splitDistance = newRadius * 2;
          
          const splitBlob = {
            ...state.player,
            id: `${state.player.id}_split`,
            radius: newRadius,
            x: state.player.x + Math.cos(angle) * splitDistance,
            y: state.player.y + Math.sin(angle) * splitDistance,
            splitVelocity: {
              x: Math.cos(angle) * SPLIT_VELOCITY,
              y: Math.sin(angle) * SPLIT_VELOCITY
            },
            lastSplitTime: now,
            canMerge: false
          };

          return {
            player: {
              ...state.player,
              radius: newRadius,
              lastSplitTime: now,
              canMerge: false
            },
            blobs: [...state.blobs, splitBlob]
          };
        });
      },
      updateSplitBlobs: (delta: number) => {
        const currentState = get();
        set(() => {
          const updatedBlobs = currentState.blobs.map(blob => {
            if (!blob.splitVelocity) return blob;

            // Update position based on velocity
            const newX = blob.x + blob.splitVelocity.x * delta;
            const newY = blob.y + blob.splitVelocity.y * delta;

            // Reduce velocity (friction)
            const friction = 0.98;
            const newVelocity = {
              x: blob.splitVelocity.x * friction,
              y: blob.splitVelocity.y * friction
            };

            // Remove velocity if too small
            const speed = Math.hypot(newVelocity.x, newVelocity.y);
            const finalVelocity = speed < 0.1 ? undefined : newVelocity;

            return {
              ...blob,
              x: newX,
              y: newY,
              splitVelocity: finalVelocity
            };
          });

          // Check for merges
          const mergedBlobs = new Set<string>();
          updatedBlobs.forEach(blob1 => {
            if (!blob1.canMerge || mergedBlobs.has(blob1.id)) return;

            updatedBlobs.forEach(blob2 => {
              if (blob1 === blob2 || !blob2.canMerge || mergedBlobs.has(blob2.id)) return;
              if (blob1.parentId !== blob2.parentId) return;

              const distance = Math.hypot(blob1.x - blob2.x, blob1.y - blob2.y);
              if (distance < MERGE_DISTANCE) {
                get().mergeBlobs(blob1, blob2);
                mergedBlobs.add(blob1.id);
                mergedBlobs.add(blob2.id);
              }
            });
          });

          return {
            blobs: updatedBlobs.filter(b => !mergedBlobs.has(b.id))
          };
        });
      },
      mergeBlobs: (blob1: Blob, blob2: Blob) => {
        const mergedRadius = Math.sqrt(blob1.radius * blob1.radius + blob2.radius * blob2.radius);
        const mergedScore = blob1.score + blob2.score;
        
        const mergedBlob = {
          ...blob1,
          radius: mergedRadius,
          score: mergedScore,
          canMerge: undefined,
          parentId: undefined,
          splitVelocity: undefined
        };

        socketService.emit('blobs:merge', {
          blob1Id: blob1.id,
          blob2Id: blob2.id,
          mergedBlob
        });

        set(() => ({
          blobs: get().blobs.filter(b => b.id !== blob2.id)
            .map(b => b.id === blob1.id ? mergedBlob : b)
        }));
      },
      ejectMass: () => {
        const currentState = get();
        const player = currentState.player;
        
        if (!player) return;
        if (player.radius < MIN_SPLIT_RADIUS) return;
        if (Date.now() - (player.lastEjectTime || 0) < EJECT_MASS_COOLDOWN) return;

        const mousePos = get().worldToScreen(player.x, player.y);
        const angle = Math.atan2(mousePos.y - window.innerHeight/2, mousePos.x - window.innerWidth/2);
        
        const ejectedMass = {
          id: `mass-${Date.now()}-${Math.random()}`,
          x: player.x + Math.cos(angle) * player.radius,
          y: player.y + Math.sin(angle) * player.radius,
          radius: EJECT_MASS_SIZE,
          color: player.color,
          splitVelocity: {
            x: Math.cos(angle) * EJECT_MASS_SPEED,
            y: Math.sin(angle) * EJECT_MASS_SPEED
          }
        };

        // Update player
        set(() => ({
          player: {
            ...player,
            radius: Math.max(MIN_SPLIT_RADIUS, player.radius - EJECT_MASS_LOSS),
            lastEjectTime: Date.now()
          }
        }));

        // Emit eject event
        socketService.emit('blob:eject', {
          playerId: player.id,
          ejectedMass
        });
      },
      getSplitCooldown: () => {
        const player = get().player;
        if (!player || !player.lastSplitTime) return 0;
        
        const timeSinceSplit = Date.now() - player.lastSplitTime;
        return Math.max(0, Math.min(100, (timeSinceSplit / SPLIT_COOLDOWN) * 100));
      },
      getEjectCooldown: () => {
        const player = get().player;
        if (!player || !player.lastEjectTime) return 0;
        
        const timeSinceEject = Date.now() - player.lastEjectTime;
        return Math.max(0, Math.min(100, (timeSinceEject / EJECT_MASS_COOLDOWN) * 100));
      },
      food: new Map(),
      matchmaking: {
        isSearching: false,
        status: '',
        region: undefined,
        gameMode: 'ffa',
        skillLevel: 0,
      },
      setMatchmakingState: (state: Partial<MatchmakingState>) => {
        set({ matchmaking: { ...get().matchmaking, ...state } });
      },
      powerUps: [],
      activePowerUps: [],
      activatePowerUp: (powerUpId: string) => {
        const state = get();
        if (!state.socket || !state.player) {
          console.warn('Cannot activate power-up: No socket or player');
          return;
        }

        const powerUp = state.activePowerUps.find(p => p.id === powerUpId);
        if (!powerUp) {
          console.warn('Cannot activate power-up: Power-up not found');
          return;
        }

        if (powerUp.playerId !== state.player.id) {
          console.warn('Cannot activate power-up: Not owned by player');
          return;
        }

        state.socket.emit('powerup:activate', {
          powerUpId,
          playerId: state.player.id
        });

        // Check for possible combos after activation
        state.checkAndActivateCombo();
      },
      activeCombos: [],

      checkAndActivateCombo: () => {
        const state = get();
        if (!state.socket || !state.player) return;

        const activePowerUpTypes = state.activePowerUps
          .filter(p => p.playerId === state.player!.id)
          .map(p => p.type);

        // Check each combo in POWER_UP_COMBOS
        Object.entries(POWER_UP_COMBOS).forEach(([comboName, combo]) => {
          const hasAllTypes = combo.types.every(type => 
            activePowerUpTypes.includes(type)
          );
          
          if (hasAllTypes && state.socket && state.player) {
            state.socket.emit('powerup:combo', {
              comboName,
              playerId: state.player.id,
              types: combo.types
            });
          }
        });
      },
      pixiApp: null,
      setPixiApp: (app: PIXI.Application) => set({ pixiApp: app }),
      socket: null,
      setSocket: (socket: Socket) => set({ socket }),
      disconnectSocket: () => set({ socket: null }),
      reconnectSocket: () => socketService.initSocket().then(socket => {
        set({ socket });
      }),
      teams: [],
      currentTeam: null,
      teamScore: 0,
      leaveTeam: () => {
        const team = get().currentTeam;
        if (!team) return;

        socketService.emit('team:leave', {
          teamId: team.id
        });
      },
      updateTeamScore: (score: number) => {
        const team = get().currentTeam;
        if (!team) return;

        socketService.emit('team:updateScore', {
          teamId: team.id,
          score
        });
      },
      handleTeamCollision: (team1Id: string, team2Id: string) => {
        const state = get();
        const team1 = state.teams.find(t => t.id === team1Id);
        const team2 = state.teams.find(t => t.id === team2Id);
        
        if (!team1 || !team2) return;
        
        // Calculate team scores based on blob sizes
        const team1Power = team1.players.reduce((sum, playerId) => {
          const blob = state.blobs.find(b => b.id === playerId);
          return sum + (blob?.radius || 0);
        }, 0);
        
        const team2Power = team2.players.reduce((sum, playerId) => {
          const blob = state.blobs.find(b => b.id === playerId);
          return sum + (blob?.radius || 0);
        }, 0);
        
        // Update team scores
        if (team1Power > team2Power * 1.25) {
          set(state => ({
            teams: state.teams.map(team => 
              team.id === team1Id 
                ? { ...team, score: team.score + Math.floor(team2Power / 10) }
                : team
            )
          }));
        }
      },

      getTeamSpawnPoint: (teamId: string) => {
        const state = get();
        const team = state.teams.find(t => t.id === teamId);
        if (!team) return { x: 0, y: 0 };

        // Calculate safe spawn point based on team territory
        const teamPlayers = state.blobs.filter(b => b.teamId === teamId);
        const centerX = teamPlayers.reduce((sum, p) => sum + p.x, 0) / (teamPlayers.length || 1);
        const centerY = teamPlayers.reduce((sum, p) => sum + p.y, 0) / (teamPlayers.length || 1);

        return { x: centerX, y: centerY };
      },

      syncTeamScore: (teamId: string, score: number) => {
        socketService.emit('team:score:sync', { teamId, score });
      },

      updateBlobPosition: (blobId: string, x: number, y: number) => {
        set(state => ({
          blobs: state.blobs.map(blob => 
            blob.id === blobId 
              ? { ...blob, x, y }
              : blob
          )
        }));
      },
      setLocalPlayer: (player: Blob) => {
        set({ player });
        // Update blobs array to include the local player
        set(state => ({
          blobs: [...state.blobs.filter(b => b.id !== player.id), player]
        }));
      },
      setMousePosition: (position: Position | null) => {
        set({ mousePosition: position });
      },
      camera: {
        zoom: 1,
        targetZoom: 1,
        position: { x: 0, y: 0 },
        bounds: {
          minX: 0,
          maxX: WORLD_SIZE,
          minY: 0,
          maxY: WORLD_SIZE
        }
      },
      updateCamera: () => {
        set(state => {
          if (!state.player) return state;

          // Calculate target zoom based on player size
          const baseZoom = 1;
          const sizeScale = 0.001;
          const minZoom = 0.5;
          const maxZoom = 2;
          const targetZoom = Math.max(minZoom, 
            Math.min(maxZoom, baseZoom - (state.player.radius * sizeScale))
          );

          // Smooth zoom interpolation
          const zoomLerp = 0.1;
          const newZoom = state.camera.zoom + 
            (targetZoom - state.camera.zoom) * zoomLerp;

          // Calculate camera bounds based on zoom
          const viewWidth = window.innerWidth * newZoom;
          const viewHeight = window.innerHeight * newZoom;
          
          // Calculate target position (centered on player)
          const targetX = state.player.x - viewWidth / 2;
          const targetY = state.player.y - viewHeight / 2;

          // Clamp target position to world bounds
          const clampedX = Math.max(0, Math.min(WORLD_SIZE - viewWidth, targetX));
          const clampedY = Math.max(0, Math.min(WORLD_SIZE - viewHeight, targetY));

          // Smooth position interpolation
          const positionLerp = 0.2;
          const newPosition = {
            x: state.camera.position.x + 
              (clampedX - state.camera.position.x) * positionLerp,
            y: state.camera.position.y + 
              (clampedY - state.camera.position.y) * positionLerp
          };

          return {
            camera: {
              ...state.camera,
              zoom: newZoom,
              position: newPosition,
              bounds: {
                minX: clampedX,
                maxX: clampedX + viewWidth,
                minY: clampedY,
                maxY: clampedY + viewHeight
              }
            }
          };
        });
      },
      setZoom: (zoom: number) => {
        set(state => ({
          camera: {
            ...state.camera,
            targetZoom: zoom
          }
        }));
      },
      startMatchmaking: () => {
        const state = get();
        socketService.emit('matchmaking:start', {
          gameMode: state.matchmaking.gameMode,
          region: state.matchmaking.region,
          skillLevel: state.matchmaking.skillLevel
        });
        set(state => ({
          matchmaking: {
            ...state.matchmaking,
            isSearching: true,
            status: 'searching'
          }
        }));
      },
      collectPowerUp: (powerUpId: string) => {
        const state = get();
        if (!state.socket || !state.player) {
          console.warn('Cannot collect power-up: No socket or player');
          return;
        }

        const powerUp = state.powerUps.find(p => p.id === powerUpId);
        if (!powerUp) {
          console.warn('Cannot collect power-up: Power-up not found');
          return;
        }

        state.socket.emit('powerup:collect', {
          powerUpId,
          playerId: state.player.id
        });
      }
    };
  })
);

// Initialize socket when game starts
socketService.initSocket().then((socket: Socket) => {
  useGameStore.getState().setSocket(socket);
}).catch(error => {
  console.error('Failed to initialize socket:', error);
});

// Setup matchmaking system listeners
matchmakingSystem.setupListeners({
  onMatchFound: (gameId) => {
    useGameStore.setState(state => ({
      matchmaking: {
        ...state.matchmaking,
        isSearching: false,
        status: 'found'
      }
    }));
    // Use the gameId to join the game
    socketService.emit('game:join', { gameId });
  },
  onMatchmakingStatus: (status) => {
    useGameStore.setState(state => ({
      matchmaking: {
        ...state.matchmaking,
        status
      }
    }));
  },
  onMatchmakingError: (error) => {
    useGameStore.setState(state => ({
      notifications: [...state.notifications, {
        id: `notification-${Date.now()}`,
        message: error,
        timestamp: Date.now()
      }]
    }));
  }
});