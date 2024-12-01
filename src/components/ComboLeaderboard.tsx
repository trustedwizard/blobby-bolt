import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { POWER_UP_COMBOS } from '../types/powerups';
import { useGameStore } from '../store/gameStore';

interface LeaderboardEntry {
  playerName: string;
  count: number;
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-md transition-colors duration-200
      ${active 
        ? 'bg-white/20 text-white' 
        : 'bg-transparent text-white/70 hover:bg-white/30'}`}
  >
    {children}
  </button>
);

export const ComboLeaderboard: React.FC = () => {
  const [selectedCombo, setSelectedCombo] = useState<string>(
    Object.keys(POWER_UP_COMBOS)[0]
  );
  
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const socket = useGameStore(state => state.socket);

  useEffect(() => {
    if (!socket) return;

    const handleComboLeaderboardUpdate = (data: LeaderboardEntry[]) => {
      setLeaderboardData(data);
    };

    socket.emit('get-combo-leaderboard', selectedCombo);
    socket.on('combo-leaderboard-update', handleComboLeaderboardUpdate);

    return () => {
      socket.off('combo-leaderboard-update', handleComboLeaderboardUpdate);
    };
  }, [socket, selectedCombo]);

  return (
    <div className="fixed right-5 top-5 bg-black/80 backdrop-blur-sm rounded-xl p-4 text-white max-w-[300px]">
      <h3 className="text-lg font-bold mb-3">Combo Leaderboard</h3>
      
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <AnimatePresence mode="wait">
          {Object.entries(POWER_UP_COMBOS).map(([key, combo]) => (
            <TabButton
              key={key}
              active={selectedCombo === key}
              onClick={() => setSelectedCombo(key)}
            >
              {combo.name}
            </TabButton>
          ))}
        </AnimatePresence>
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {leaderboardData.map((entry, index) => (
            <motion.div
              key={entry.playerName}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-3 py-2 border-b border-white/10 last:border-0"
            >
              <span className="text-white/50">#{index + 1}</span>
              <span className="flex-1 truncate">{entry.playerName}</span>
              <span className="font-bold text-yellow-400">{entry.count}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}; 