import React from 'react';
import { Zap, Trophy } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

interface GameBlob {
  id: string;
  name: string;
  score: number;
}

export function GameUI() {
  const { player, blobs, getSplitCooldown, getEjectCooldown } = useGameStore(state => ({
    player: state.player,
    blobs: state.blobs,
    getSplitCooldown: state.getSplitCooldown,
    getEjectCooldown: state.getEjectCooldown
  }));

  // Sort players by score and take top 4
  const sortedPlayers = [...blobs]
    .sort((a: GameBlob, b: GameBlob) => b.score - a.score)
    .slice(0, 4);

  return (
    <div className="fixed inset-0 pointer-events-none">
      {/* Top left - Score and Power bar */}
      <div className="absolute top-4 left-4 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-6 h-6 text-yellow-400" />
          <span className="text-2xl font-bold">{player?.score || 0}</span>
        </div>
        <div className="w-48 h-2 bg-gray-800 rounded-full">
          <div 
            className="h-full bg-cyan-400 rounded-full transition-all"
            style={{ width: `${Math.min((player?.score || 0) / 50, 100)}%` }}
          />
        </div>
      </div>

      {/* Top right - Leaderboard */}
      <div className="absolute top-4 right-4 bg-gray-900/80 backdrop-blur-sm rounded-lg p-4 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <span className="font-bold">Leaderboard</span>
        </div>
        {sortedPlayers.map((player) => (
          <div key={player.id} className="flex justify-between items-center mb-1">
            <span className="text-gray-300">{player.name}</span>
            <span className="text-cyan-400 font-mono">{player.score}</span>
          </div>
        ))}
      </div>

      {/* Bottom right - Cooldown indicators */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <div className="relative w-12 h-12 bg-gray-900/80 backdrop-blur-sm rounded-full">
          <div 
            className="absolute inset-0 bg-cyan-400/20 rounded-full"
            style={{ 
              clipPath: `circle(${getSplitCooldown()}% at center)` 
            }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-white text-sm">
            SPACE
          </span>
        </div>
        <div className="relative w-12 h-12 bg-gray-900/80 backdrop-blur-sm rounded-full">
          <div 
            className="absolute inset-0 bg-cyan-400/20 rounded-full"
            style={{ 
              clipPath: `circle(${getEjectCooldown()}% at center)` 
            }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-white text-sm">
            W
          </span>
        </div>
      </div>
    </div>
  );
}