import React from 'react';
import { motion } from 'framer-motion';

interface PowerUpTimerProps {
  id: string;
  type: string;
  timeRemaining: number;
  duration: number;
  icon: string;
  compact?: boolean;
}

export const PowerUpTimer: React.FC<PowerUpTimerProps> = ({
  id,
  type,
  timeRemaining,
  duration,
  icon,
  compact
}) => {
  const progress = Math.max(0, Math.min(100, (timeRemaining / duration) * 100));

  return (
    <div className="flex items-center gap-2 bg-black/50 rounded-lg p-2">
      <img src={`/assets/icons/${icon}.png`} className="w-8 h-8" alt={type} />
      <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-cyan-400"
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>
    </div>
  );
};

export default PowerUpTimer; 