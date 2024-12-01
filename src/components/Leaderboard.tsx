import React from 'react';
import { LeaderboardEntry } from '../types/hud';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ entries }) => {
  return (
    <div className="bg-black/50 rounded-lg p-4 text-white">
      <div className="text-lg font-bold mb-2">Leaderboard</div>
      <div className="flex flex-col gap-1">
        {entries.map((entry) => (
          <div
            key={entry.rank}
            className={`flex items-center justify-between ${
              entry.isPlayer ? 'text-cyan-400' : 'text-white'
            }`}
          >
            <span>#{entry.rank} {entry.name}</span>
            <span className="font-mono">{entry.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
};