import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { comboStatsService } from '../services/comboStatsService';
import { POWER_UP_COMBOS, PowerUpCombo } from '../types/powerups';

interface ComboStats {
  totalActivations: number;
  successfulHits: number;
}

interface ComboStatEntry {
  type: string;
  stats: ComboStats;
}

interface BarProps {
  width: number;
  color: string;
  children?: React.ReactNode;
}

const Bar: React.FC<BarProps> = ({ width, color, children }) => (
  <div className="relative h-5">
    <motion.div
      className="absolute inset-0 rounded bg-gradient-to-r"
      style={{ 
        width: `${width}%`,
        background: color,
      }}
      initial={{ width: 0 }}
      animate={{ width: `${width}%` }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/20 to-white/10" />
    </motion.div>
    {children}
  </div>
);

const COMBO_COLORS: Record<string, string> = {
  'SPEED_SHIELD': 'linear-gradient(90deg, #ffdd00, #00ff00)',
  'GHOST_SIZE': 'linear-gradient(90deg, #ff00ff, #0000ff)',
  'POINTS_SPEED': 'linear-gradient(90deg, #ff0000, #ff8800)'
};

export const ComboStatsChart: React.FC = () => {
  const [stats, setStats] = useState<ComboStatEntry[]>(() => 
    Object.keys(POWER_UP_COMBOS).map(comboType => {
      const comboStats = comboStatsService.getStats(comboType);
      if (!comboStats) {
        return {
          type: comboType,
          stats: { totalActivations: 0, successfulHits: 0 }
        };
      }
      return {
        type: comboType,
        stats: comboStats
      };
    })
  );

  useEffect(() => {
    const updateStats = () => {
      setStats(Object.keys(POWER_UP_COMBOS).map(comboType => {
        const comboStats = comboStatsService.getStats(comboType);
        if (!comboStats) {
          return {
            type: comboType,
            stats: { totalActivations: 0, successfulHits: 0 }
          };
        }
        return {
          type: comboType,
          stats: comboStats
        };
      }));
    };

    window.addEventListener('combo-stats-updated', updateStats);
    return () => window.removeEventListener('combo-stats-updated', updateStats);
  }, []);

  const maxActivations = useMemo(() => 
    Math.max(...stats.map(s => s.stats?.totalActivations || 0)),
    [stats]
  );

  return (
    <div className="fixed right-5 bottom-[100px] bg-black/80 backdrop-blur-sm rounded-xl p-4 text-white w-[300px]">
      <h4 className="text-center font-bold mb-4">Combo Usage Statistics</h4>
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {stats.map(({ type, stats }) => {
            if (!stats) return null;
            const combo = POWER_UP_COMBOS[type as keyof typeof POWER_UP_COMBOS] as PowerUpCombo;
            const percentage = (stats.totalActivations / maxActivations) * 100 || 0;
            
            return (
              <motion.div
                key={type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="flex justify-between text-sm mb-1">
                  <span>{combo.name}</span>
                  <span>{stats.totalActivations}</span>
                </div>
                <Bar 
                  width={percentage} 
                  color={COMBO_COLORS[type] || '#ffffff'}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}; 