import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LeaderboardEntry as ComboLeaderboardEntry } from '../types/leaderboard';
import type { LeaderboardEntry as HUDLeaderboardEntry } from '../types/hud';

type LeaderboardProps = {
  entries: ComboLeaderboardEntry[] | HUDLeaderboardEntry[];
  compact?: boolean;
  title?: string;
  showPlayerCount?: boolean;
  type?: 'combo' | 'game';
};

const LeaderboardItem = memo<{ entry: ComboLeaderboardEntry | HUDLeaderboardEntry; rank: number; type: 'combo' | 'game' }>(({
  entry,
  rank,
  type
}) => {
  if (type === 'combo') {
    const { playerName, activations, successRate } = entry as ComboLeaderboardEntry;
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className={`flex items-center justify-between py-1.5 px-3 rounded transition-colors`}
      >
        <div className="flex items-center gap-2">
          <span className={`w-6 text-sm ${getRankColor(rank)}`}>#{rank}</span>
          <span className="font-medium truncate max-w-[120px]">{playerName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-gray-400">{formatNumber(activations)}</span>
          <span className={`text-xs ${getSuccessRateColor(successRate)}`}>
            {Math.round(successRate * 100)}%
          </span>
        </div>
      </motion.div>
    );
  }

  const { name, score, isPlayer } = entry as HUDLeaderboardEntry;
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`flex items-center justify-between py-1.5 px-3 rounded transition-colors ${
        isPlayer ? 'bg-cyan-500/20' : 'hover:bg-white/5'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`w-6 text-sm ${getRankColor(rank)}`}>#{rank}</span>
        <span className={`font-medium truncate max-w-[120px] ${isPlayer ? 'text-cyan-400' : 'text-white'}`}>
          {name}
        </span>
      </div>
      <span className="font-mono text-sm text-gray-400">{formatNumber(score)}</span>
    </motion.div>
  );
});

const getRankColor = (rank: number): string => {
  switch (rank) {
    case 1: return 'text-yellow-400';
    case 2: return 'text-gray-400';
    case 3: return 'text-amber-600';
    default: return 'text-gray-500';
  }
};

const getSuccessRateColor = (rate: number): string => {
  if (rate >= 0.8) return 'text-green-400';
  if (rate >= 0.6) return 'text-yellow-400';
  if (rate >= 0.4) return 'text-orange-400';
  return 'text-red-400';
};

const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
};

export const Leaderboard = memo<LeaderboardProps>(({ 
  entries, 
  compact = false,
  title = 'Leaderboard',
  showPlayerCount = true,
  type = 'game'
}) => {
  return (
    <div className={`bg-black/50 backdrop-blur-sm rounded-lg p-4 ${compact ? 'w-48' : 'w-64'}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-bold">{title}</h2>
        {showPlayerCount && (
          <span className="text-xs text-gray-400">{entries.length} Players</span>
        )}
      </div>
      
      <div className="space-y-1">
        <AnimatePresence mode="popLayout">
          {entries.map((entry, index) => (
            <LeaderboardItem
              key={type === 'combo' ? 
                `${(entry as ComboLeaderboardEntry).playerId}-${(entry as ComboLeaderboardEntry).activations}` :
                `${(entry as HUDLeaderboardEntry).rank}-${(entry as HUDLeaderboardEntry).name}`
              }
              entry={entry}
              rank={index + 1}
              type={type}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});