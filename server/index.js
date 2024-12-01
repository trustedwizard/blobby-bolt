import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { CollisionSystem } from './collisionSystem.js';
import { GameStateManager } from './systems/GameStateManager.js';
import PowerUpSystem from './powerUpSystem.js';

const app = express();
const httpServer = createServer(app);

// Configure CORS for both Express and Socket.IO
app.use(cors());

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store active rooms
const activeRooms = new Map();

// Initialize systems with proper configuration
const gameState = new GameStateManager({
  worldSize: 4000,
  maxPlayers: 50
});

const collisionSystem = new CollisionSystem(4000);

const powerUpSystem = new PowerUpSystem(io, gameState);

// Add game update interval
setInterval(() => {
  gameState.update();
  io.emit('game:state', gameState.getState());
}, 1000 / 60); // 60 FPS updates

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send initial rooms list to new clients
  socket.emit('rooms:list', Array.from(activeRooms.values()));
  
  socket.on('room:create', (room) => {
    console.log('Creating room:', room);
    
    // Add room to active rooms
    activeRooms.set(room.id, {
      ...room,
      players: [],
      createdAt: Date.now()
    });

    // Join the room's Socket.IO channel
    socket.join(room.id);
    
    // Add the creator to the room's players
    activeRooms.get(room.id).players.push(socket.id);
    
    // Notify the creator that room was created
    socket.emit('room:created', activeRooms.get(room.id));
    
    // Notify all clients about the new room
    io.emit('rooms:updated', Array.from(activeRooms.values()));
  });

  socket.on('room:join', ({ roomId }) => {
    const room = activeRooms.get(roomId);
    if (!room) {
      socket.emit('room:join:error', 'Room not found');
      return;
    }

    if (room.players.length >= room.maxPlayers) {
      socket.emit('room:join:error', 'Room is full');
      return;
    }

    // Join the room
    socket.join(roomId);
    room.players.push(socket.id);
    
    // Notify the player they joined successfully
    socket.emit('room:joined', room);
    
    // Notify other players in the room
    socket.to(roomId).emit('player:joined', { 
      playerId: socket.id,
      room: room
    });
    
    // Update room list for all clients
    io.emit('rooms:updated', Array.from(activeRooms.values()));
  });

  // Add game state handlers
  socket.on('player:join', (playerData) => {
    gameState.addPlayer(socket.id, playerData);
    socket.emit('game:state', gameState.getState());
  });

  socket.on('player:update', (position) => {
    gameState.updatePlayerPosition(socket.id, position);
    socket.broadcast.emit('player:updated', {
      id: socket.id,
      position
    });
  });

  // Add collision handlers
  socket.on('collision:detect', (data) => {
    const collisionResult = collisionSystem.detectCollisions(data);
    if (collisionResult) {
      io.emit('collision:effect', collisionResult);
    }
  });

  // Add power-up handlers
  socket.on('powerup:collect', ({ powerUpId, playerId }) => {
    const result = powerUpSystem.collectPowerUp(powerUpId, playerId);
    if (result) {
      io.emit('powerup:collected', result);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Remove player from any rooms they were in
    activeRooms.forEach((room, roomId) => {
      const playerIndex = room.players.indexOf(socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        
        // If room is empty, remove it
        if (room.players.length === 0) {
          activeRooms.delete(roomId);
        }
        
        // Notify remaining players
        io.to(roomId).emit('player:left', {
          playerId: socket.id,
          room: room
        });
      }
    });
    
    // Update room list for all clients
    io.emit('rooms:updated', Array.from(activeRooms.values()));
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});