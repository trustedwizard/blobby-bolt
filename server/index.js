import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { CollisionSystem } from './collisionSystem.js';
import { GameStateManager } from './systems/GameStateManager.js';
import { ComboLeaderboardSystem } from './comboLeaderboardSystem.js';
import { FoodSystem } from './foodSystem.js';
import { AISystem } from './aiSystem.js';
import { performance } from 'perf_hooks';
import { config } from './utils/config.js';
import { logger } from './utils/logger.js';
import { PowerUpSystem } from './powerUpSystem.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Configure CORS for both Express and Socket.IO
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST'],
  credentials: true
}));

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 10000
});

// Initialize game systems
const gameState = new GameStateManager({
  worldSize: config.worldSize,
  maxPlayers: config.maxPlayers
});

const collisionSystem = new CollisionSystem(config.worldSize);
const foodSystem = new FoodSystem(config.worldSize);
const comboSystem = new ComboLeaderboardSystem();
const aiSystem = new AISystem(config.worldSize);
const powerUpSystem = new PowerUpSystem(config.worldSize);

// Performance monitoring
let lastUpdateTime = performance.now();
let lastPlayerLogTime = Date.now();
const PLAYER_LOG_INTERVAL = 5000; // Log player stats every 5 seconds

const performanceMetrics = {
  lastTickTime: 0,
  tickCount: 0,
  avgTickTime: 0,
  peakTickTime: 0,
  startTime: Date.now()
};

function updatePerformanceMetrics(tickTime) {
  performanceMetrics.lastTickTime = tickTime;
  performanceMetrics.tickCount++;
  performanceMetrics.avgTickTime = 
    ((performanceMetrics.avgTickTime * (performanceMetrics.tickCount - 1)) + tickTime) 
    / performanceMetrics.tickCount;
  performanceMetrics.peakTickTime = Math.max(performanceMetrics.peakTickTime, tickTime);
}

function getPerformanceStats() {
  const { lastTickTime, avgTickTime, peakTickTime, tickCount, startTime } = performanceMetrics;
  const uptime = (Date.now() - startTime) / 1000;
  
  return {
    lastTickTime: Math.round(lastTickTime * 100) / 100,
    avgTickTime: Math.round(avgTickTime * 100) / 100,
    peakTickTime: Math.round(peakTickTime * 100) / 100,
    tickCount,
    uptime: Math.round(uptime),
    players: io.engine.clientsCount,
    realPlayers: gameState.getRealPlayerCount(),
    aiPlayers: gameState.getAIPlayerCount()
  };
}

function manageAIPlayers() {
  const realPlayerCount = gameState.getRealPlayerCount();
  const currentAICount = gameState.getAIPlayerCount();
  const desiredAICount = Math.max(0, Math.min(config.maxAiPlayers, config.minPlayers - realPlayerCount));

  if (currentAICount < desiredAICount) {
    gameState.spawnAIPlayer();
  } else if (currentAICount > desiredAICount) {
    gameState.removeExcessAIPlayers(currentAICount - desiredAICount);
  }
}

function handleCollisions() {
  const collisions = collisionSystem.checkCollisions(
    Array.from(gameState.players.values()),
    Array.from(foodSystem.getAllFood())
  );

  for (const collision of collisions) {
    const { type, entity1, entity2 } = collision;

    switch (type) {
      case 'player-food':
        gameState.consumeFood(entity1.id, entity2);
        foodSystem.removeFood(entity2.id);
        io.emit('food:consumed', { playerId: entity1.id, foodId: entity2.id });
        break;
      case 'player-player':
        const result = gameState.handlePlayerCollision(entity1.id, entity2.id);
        if (result.consumed) {
          comboSystem.onPlayerKill(result.predator, result.prey);
          io.emit('player:consumed', result);
        }
        break;
      case 'player-ejected':
        gameState.consumeEjectedMass(entity1.id, entity2);
        foodSystem.removeFood(entity2.id);
        io.emit('mass:consumed', { playerId: entity1.id, massId: entity2.id });
        break;
    }
  }
}

// System performance monitoring
const systemMetrics = {
  gameState: { updateTime: 0, errorCount: 0, lastUpdate: Date.now() },
  food: { updateTime: 0, errorCount: 0, lastUpdate: Date.now() },
  collision: { updateTime: 0, errorCount: 0, lastUpdate: Date.now() },
  powerUp: { updateTime: 0, errorCount: 0, lastUpdate: Date.now() },
  ai: { updateTime: 0, errorCount: 0, lastUpdate: Date.now() },
  combo: { updateTime: 0, errorCount: 0, lastUpdate: Date.now() }
};

// Health check status
const systemHealth = {
  gameState: true,
  food: true,
  collision: true,
  powerUp: true,
  ai: true,
  combo: true,
  lastCheck: Date.now()
};

// Error boundary wrapper
const withErrorBoundary = async (systemName, operation) => {
  const startTime = performance.now();
  try {
    await operation();
    systemMetrics[systemName].updateTime = performance.now() - startTime;
    systemMetrics[systemName].lastUpdate = Date.now();
    systemHealth[systemName] = true;
  } catch (error) {
    systemMetrics[systemName].errorCount++;
    systemHealth[systemName] = false;
    logger.error(`Error in ${systemName}:`, {
      error: error.message,
      stack: error.stack,
      systemName,
      metrics: systemMetrics[systemName]
    });
    // Attempt recovery if possible
    await handleSystemError(systemName, error);
  }
};

// System error recovery
const handleSystemError = async (systemName, error) => {
  logger.info(`Attempting recovery for ${systemName}`);
  try {
    switch (systemName) {
      case 'gameState':
        gameState.update();
        break;
      case 'food':
        foodSystem.clear();
        foodSystem.generateInitialFood();
        break;
      case 'powerUp':
        powerUpSystem.clear();
        break;
      case 'ai':
        aiSystem.reset();
        break;
      case 'combo':
        comboSystem.reset();
        break;
    }
    logger.info(`Recovery successful for ${systemName}`);
  } catch (recoveryError) {
    logger.error(`Recovery failed for ${systemName}:`, {
      error: recoveryError.message,
      stack: recoveryError.stack
    });
  }
};

// Health check function
const performHealthCheck = () => {
  const now = Date.now();
  const healthCheckInterval = 30000; // 30 seconds

  Object.entries(systemMetrics).forEach(([system, metrics]) => {
    const timeSinceLastUpdate = now - metrics.lastUpdate;
    systemHealth[system] = timeSinceLastUpdate < healthCheckInterval && 
                          metrics.errorCount < 5;
  });

  systemHealth.lastCheck = now;

  // Log health status
  logger.info('System Health Check:', {
    status: systemHealth,
    metrics: systemMetrics
  });

  // Notify admin if any system is unhealthy
  const unhealthySystems = Object.entries(systemHealth)
    .filter(([key, status]) => key !== 'lastCheck' && !status)
    .map(([system]) => system);

  if (unhealthySystems.length > 0) {
    logger.error('Unhealthy Systems Detected:', {
      systems: unhealthySystems,
      metrics: unhealthySystems.map(sys => systemMetrics[sys])
    });
  }

  return systemHealth;
};

// Game update loop
const gameLoop = async () => {
  const now = performance.now();
  const deltaTime = (now - lastUpdateTime) / 1000;
  
  try {
    // Update game systems with error boundaries
    await withErrorBoundary('gameState', async () => {
      gameState.update();
      
      // Rate limit player logging
      const currentTime = Date.now();
      if (currentTime - lastPlayerLogTime >= PLAYER_LOG_INTERVAL) {
        logger.info('Player Update:', {
          realPlayers: gameState.getRealPlayerCount(),
          aiPlayers: gameState.getAIPlayerCount(),
          totalPlayers: gameState.players.size
        });
        lastPlayerLogTime = currentTime;
      }
    });

    await withErrorBoundary('food', async () => {
      foodSystem.update(gameState.getRealPlayerCount());
    });

    await withErrorBoundary('powerUp', async () => {
      powerUpSystem.update(deltaTime);
    });

    if (gameState.getRealPlayerCount() < config.minPlayers) {
      await withErrorBoundary('ai', async () => {
        aiSystem.update(deltaTime, gameState, foodSystem);
      });
    }

    await withErrorBoundary('collision', async () => {
      handleCollisions();
    });

    await withErrorBoundary('combo', async () => {
      comboSystem.update(Array.from(gameState.players.values()));
    });

    // Broadcast game state at a fixed rate
    io.emit('game:state', {
      players: Array.from(gameState.players.values()),
      food: Array.from(foodSystem.getAllFood()),
      leaderboard: gameState.leaderboard,
      powerUps: powerUpSystem.getActivePowerUps(),
      timestamp: Date.now()
    });

  } catch (error) {
    logger.error('Critical error in game loop:', {
      error: error.message,
      stack: error.stack
    });
  }

  lastUpdateTime = now;
};

// Start the game loop with a fixed tick rate
const TICK_RATE = config.tickRate || 60;
const TICK_INTERVAL = Math.floor(1000 / TICK_RATE);
const gameLoopInterval = setInterval(gameLoop, TICK_INTERVAL);

// Add health check interval
setInterval(performHealthCheck, 30000);

// Add metrics endpoint for monitoring
app.get('/metrics', (req, res) => {
  res.json({
    health: systemHealth,
    metrics: systemMetrics,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    players: {
      total: gameState.players.size,
      real: gameState.getRealPlayerCount(),
      ai: gameState.getAIPlayerCount()
    }
  });
});

// Add graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Initiating graceful shutdown...');
  
  // Stop game loop
  clearInterval(gameLoopInterval);
  
  // Disconnect all players
  io.emit('server:shutdown');
  
  // Close all connections
  io.close();
  
  logger.info('Shutdown complete');
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start the server
const PORT = process.env.PORT || 3001;

try {
  httpServer.listen(PORT, () => {
    logger.info(`Server listening on http://localhost:${PORT}`);
    logger.info('System configuration:', {
      nodeEnv: process.env.NODE_ENV,
      worldSize: config.worldSize,
      maxPlayers: config.maxPlayers,
      minPlayers: config.minPlayers,
      maxAiPlayers: config.maxAiPlayers,
      tickRate: config.tickRate,
      corsOrigin: process.env.CLIENT_URL || '*'
    });
  });

  // Configure Socket.IO
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });

    // Room management
    socket.on('room:create', (roomConfig) => {
      try {
        logger.info('Creating room:', roomConfig);
        const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const room = gameState.createRoom({
          id: roomId,
          name: roomConfig.name || `Room ${roomId}`,
          maxPlayers: roomConfig.maxPlayers || config.maxPlayers,
          isPrivate: roomConfig.isPrivate || false,
          password: roomConfig.password || '',
          gameMode: roomConfig.gameMode || 'classic',
          createdBy: socket.id
        });
        socket.join(roomId);
        io.emit('room:created', room);
        logger.info(`Room created: ${roomId}`);
      } catch (error) {
        logger.error('Error creating room:', error);
        socket.emit('room:create:error', 'Failed to create room');
      }
    });

    socket.on('room:join', ({ roomId, password, playerData }) => {
      try {
        const room = gameState.getRoom(roomId);
        if (!room) {
          socket.emit('room:join:error', 'Room not found');
          return;
        }

        if (room.isPrivate && room.password !== password) {
          socket.emit('room:join:error', 'Invalid password');
          return;
        }

        if (room.players.size >= room.maxPlayers) {
          socket.emit('room:join:error', 'Room is full');
          return;
        }

        const player = {
          id: socket.id,
          name: playerData.name || `Player ${socket.id}`,
          isReady: false,
          isConnected: true,
          lastPing: Date.now(),
          stats: {
            score: 0,
            kills: 0,
            deaths: 0,
            foodEaten: 0,
            timeAlive: 0,
            highestMass: 0,
            maxCombo: 0,
            powerUpsCollected: 0
          }
        };

        socket.join(roomId);
        gameState.addPlayerToRoom(roomId, socket.id, player);
        io.to(roomId).emit('room:player:joined', { roomId, playerId: socket.id, player });
        logger.info(`Player ${socket.id} joined room ${roomId}`);
      } catch (error) {
        logger.error('Error joining room:', error);
        socket.emit('room:join:error', 'Failed to join room');
      }
    });

    // Game state updates
    socket.on('player:move', (data) => {
      const player = gameState.getPlayer(socket.id);
      if (player) {
        player.x = data.x;
        player.y = data.y;
        player.velocity = data.velocity;
        socket.broadcast.emit('player:update', player);
      }
    });

    socket.on('player:split', () => {
      const player = gameState.getPlayer(socket.id);
      if (player) {
        gameState.splitPlayer(socket.id);
        io.emit('player:split', { playerId: socket.id });
      }
    });

    socket.on('player:eject', () => {
      const player = gameState.getPlayer(socket.id);
      if (player) {
        gameState.ejectMass(socket.id);
        io.emit('player:eject', { playerId: socket.id });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
      // Clean up rooms
      for (const [roomId, room] of gameState.rooms) {
        if (room.players.has(socket.id)) {
          gameState.removePlayerFromRoom(roomId, socket.id);
          io.to(roomId).emit('room:player:left', { roomId, playerId: socket.id });
          
          // If room is empty, remove it
          if (room.players.size === 0) {
            gameState.removeRoom(roomId);
            io.emit('room:removed', { roomId });
          }
        }
      }
    });
  });

  // Error handling for HTTP server
  httpServer.on('error', (error) => {
    logger.error('HTTP Server error:', error);
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${PORT} is already in use. Please choose a different port or stop the other process.`);
      process.exit(1);
    }
  });

} catch (error) {
  logger.error('Failed to start server:', error);
  process.exit(1);
}