import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PowerUpType, POWER_UP_PROPERTIES } from '../types/powerups';
import { useGameStore } from '../store/gameStore';
import PowerUpTimer from './PowerUpTimer';

interface PowerUpHUDProps {
  compact?: boolean;
}

interface ActivePowerUp {
  id: string;
  type: PowerUpType;
  powerUpType: PowerUpType;
  expiresAt: number;
}

export const PowerUpHUD: React.FC<PowerUpHUDProps> = ({ compact = false }) => {
  const activePowerUps = useGameStore(state => state.activePowerUps) as ActivePowerUp[];
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  return (
    <div className={`fixed top-4 right-4 flex flex-col items-end gap-2 ${
      compact ? 'scale-75 origin-top-right' : ''
    }`}>
      <AnimatePresence>
        {activePowerUps.map(powerUp => (
          <motion.div
            key={powerUp.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="relative"
            onMouseEnter={() => setShowTooltip(powerUp.id)}
            onMouseLeave={() => setShowTooltip(null)}
          >
            <PowerUpTimer
              id={powerUp.id}
              type={powerUp.powerUpType}
              timeRemaining={powerUp.expiresAt - Date.now()}
              duration={POWER_UP_PROPERTIES[powerUp.powerUpType].duration}
              icon={POWER_UP_PROPERTIES[powerUp.powerUpType].icon}
              compact={compact}
            />
            
            {showTooltip === powerUp.id && (
              <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-black/90 text-white text-sm rounded-lg px-3 py-2 whitespace-nowrap">
                {POWER_UP_PROPERTIES[powerUp.powerUpType].description}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}; 