import React from 'react';

interface StatsDisplayProps {
  score: number;
  rank: number;
  fps: number;
  ping: number;
}

export const StatsDisplay: React.FC<StatsDisplayProps> = ({ score, rank, fps, ping }) => {
  return (
    <div className="bg-black/50 rounded-lg p-4 text-white">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span>Score:</span>
          <span className="font-bold">{score}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Rank:</span>
          <span className="font-bold">#{rank}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>FPS:</span>
          <span className="font-bold">{fps}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Ping:</span>
          <span className="font-bold">{ping}ms</span>
        </div>
      </div>
    </div>
  );
};

export default StatsDisplay; 