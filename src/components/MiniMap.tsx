import React from 'react';

interface MiniMapProps {
  playerPosition: { x: number; y: number };
  visiblePlayers: Array<{ x: number; y: number; color: string | number }>;
  viewport: { x: number; y: number; width: number; height: number };
}

export const MiniMap: React.FC<MiniMapProps> = ({
  playerPosition,
  visiblePlayers,
  viewport
}) => {
  const MINIMAP_SIZE = 150;
  const WORLD_SIZE = 4000;
  const scale = MINIMAP_SIZE / WORLD_SIZE;

  return (
    <div 
      className="bg-black/50 rounded-lg p-2"
      style={{ width: MINIMAP_SIZE, height: MINIMAP_SIZE }}
    >
      <div className="relative w-full h-full">
        {/* Viewport indicator */}
        <div
          className="absolute border border-white/30"
          style={{
            left: viewport.x * scale,
            top: viewport.y * scale,
            width: viewport.width * scale,
            height: viewport.height * scale
          }}
        />
        
        {/* Players */}
        {visiblePlayers.map((player, index) => (
          <div
            key={index}
            className="absolute w-2 h-2 rounded-full"
            style={{
              left: player.x * scale,
              top: player.y * scale,
              backgroundColor: typeof player.color === 'number' 
                ? `#${player.color.toString(16)}` 
                : player.color
            }}
          />
        ))}
        
        {/* Player position */}
        <div
          className="absolute w-2 h-2 bg-cyan-400 rounded-full"
          style={{
            left: playerPosition.x * scale,
            top: playerPosition.y * scale
          }}
        />
      </div>
    </div>
  );
}; 