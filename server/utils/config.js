import 'dotenv/config';

export const config = {
  worldSize: parseInt(process.env.WORLD_SIZE) || 4000,
  maxPlayers: parseInt(process.env.MAX_PLAYERS) || 50,
  minPlayers: parseInt(process.env.MIN_PLAYERS) || 10,
  maxAiPlayers: parseInt(process.env.MAX_AI_PLAYERS) || 40,
  tickRate: parseInt(process.env.TICK_RATE) || 60,
  port: parseInt(process.env.PORT) || 3001,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  logDir: process.env.LOG_DIR || 'logs'
}; 