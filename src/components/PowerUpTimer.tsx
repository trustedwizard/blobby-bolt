import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PowerUpType } from '../types/powerups';

interface PowerUpTimerProps {
  id: string;
  type: PowerUpType;
  timeRemaining: number;
  duration: number;
  icon: string;
  compact?: boolean;
}

const PowerUpTimer: React.FC<PowerUpTimerProps> = ({
  id,
  type,
  timeRemaining,
  duration,
  icon,
  compact = false
}) => {
  const [progress, setProgress] = useState(100);
  const [isExpiring, setIsExpiring] = useState(false);

  useEffect(() => {
    setProgress(Math.max(0, Math.min(100, (timeRemaining / duration) * 100)));
    setIsExpiring(timeRemaining < 2000);
  }, [timeRemaining, duration]);

  const getColorByType = (type: PowerUpType): string => {
    switch (type) {
      case PowerUpType.SPEED:
        return 'bg-yellow-400';
      case PowerUpType.SHIELD:
        return 'bg-cyan-400';
      case PowerUpType.MASS:
        return 'bg-purple-400';
      case PowerUpType.GHOST:
        return 'bg-gray-400';
      case PowerUpType.SPLIT:
        return 'bg-blue-400';
      default:
        return 'bg-blue-400';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key={id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`flex items-center gap-2 bg-black/50 rounded-lg p-2 ${
          compact ? 'scale-75' : ''
        }`}
      >
        <div className="relative">
          <img 
            src={`/assets/icons/${icon}.png`} 
            className={`w-8 h-8 ${isExpiring ? 'animate-pulse' : ''}`}
            alt={type}
          />
          {isExpiring && (
            <motion.div
              className="absolute inset-0 rounded-full bg-red-500/30"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </div>

        <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${getColorByType(type)}`}
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>

        {!compact && (
          <div className="text-xs text-white/80">
            {Math.ceil(timeRemaining / 1000)}s
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default PowerUpTimer; 