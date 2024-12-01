import winston from 'winston';
import fs from 'fs';
import { config } from './config.js';

// Create logs directory if it doesn't exist
if (!fs.existsSync(config.logDir)) {
  fs.mkdirSync(config.logDir);
}

// Initialize logger
const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: `${config.logDir}/error.log`, 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: `${config.logDir}/combined.log` 
    })
  ]
});

// Add console transport in development
if (config.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export { logger }; 