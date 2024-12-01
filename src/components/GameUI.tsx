import React, { useMemo } from 'react';
import { Zap, Trophy } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

interface GameBlob {
  id: string;
  name: string;
  score: number;
}

interface CooldownIndicatorProps {
  cooldown: number;
  label: string;
}

const CooldownIndicator: React.FC<CooldownIndicatorProps> = ({ cooldown, label }) => (
  <div className="relative w-12 h-12 bg-gray-900/80 backdrop-blur-sm rounded-full">
    <div 
      className="absolute inset-0 bg-cyan-400/20 rounded-full transition-all duration-200"
      style={{ 
        clipPath: `circle(${cooldown}% at center)` 
      }}
    />
    <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-medium">
      {label}
    </span>
  </div>
);

const LeaderboardEntry: React.FC<{ player: GameBlob }> = ({ player }) => (
  <div className="flex justify-between items-center mb-1 last:mb-0">
    <span className="text-gray-300 truncate max-w-[120px]">{player.name}</span>
    <span className="text-cyan-400 font-mono ml-4">{player.score}</span>
  </div>
);

export function GameUI() {
  const { player, blobs } = useGameStore((state) => ({
    player: state.player,
    blobs: state.blobs
  }));

  const sortedPlayers = useMemo(() => 
    [...blobs]
      .sort((a: GameBlob, b: GameBlob) => b.score - a.score)
      .slice(0, 4),
    [blobs]
  );

  const powerPercentage = useMemo(() => 
    Math.min(((player?.score || 0) / 50) * 100, 100),
    [player?.score]
  );

  return (
    <div className="fixed inset-0 pointer-events-none">
      {/* Score and Power bar */}
      <div className="absolute top-4 left-4 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-6 h-6 text-yellow-400" />
          <span className="text-2xl font-bold">{player?.score || 0}</span>
        </div>
        <div className="w-48 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-cyan-400 rounded-full transition-all duration-300"
            style={{ width: `${powerPercentage}%` }}
          />
        </div>
      </div>

      {/* Leaderboard */}
      <div className="absolute top-4 right-4 bg-gray-900/80 backdrop-blur-sm rounded-lg p-4 text-white min-w-[180px]">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <span className="font-bold">Leaderboard</span>
        </div>
        {sortedPlayers.map((player) => (
          <LeaderboardEntry key={player.id} player={player} />
        ))}
      </div>

      {/* Cooldown indicators */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <CooldownIndicator cooldown={100} label="SPACE" />
        <CooldownIndicator cooldown={100} label="W" />
      </div>
    </div>
  );
}