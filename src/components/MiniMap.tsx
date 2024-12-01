import React, { useRef, useEffect, memo, useCallback } from 'react';
import { Position, Blob } from '../types/common';
import { BlobErrorBoundary } from './BlobErrorBoundary';

interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MiniMapProps {
  playerPosition: Position;
  visiblePlayers: Blob[];
  viewport: Viewport;
  worldSize: number;
  size?: number;
}

const COLORS = {
  background: 'rgba(0, 0, 0, 0.5)',
  viewport: 'rgba(255, 255, 255, 0.3)',
  player: '#ffffff'
} as const;

const MiniMapComponent: React.FC<MiniMapProps> = ({
  playerPosition,
  visiblePlayers,
  viewport,
  worldSize,
  size = 200
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawMap = useCallback((ctx: CanvasRenderingContext2D) => {
    // Clear and draw background
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, size, size);

    // Scale factor for converting world coordinates to minimap coordinates
    const scale = size / worldSize;

    // Draw viewport area
    ctx.strokeStyle = COLORS.viewport;
    ctx.strokeRect(
      viewport.x * scale,
      viewport.y * scale,
      viewport.width * scale,
      viewport.height * scale
    );

    // Draw other players
    visiblePlayers.forEach(player => {
      if (player.x === playerPosition.x && player.y === playerPosition.y) return;
      
      const color = player.color.toString(16).padStart(6, '0');
      ctx.beginPath();
      ctx.fillStyle = `#${color}`;
      ctx.arc(
        player.x * scale,
        player.y * scale,
        Math.max(2, player.radius * scale * 0.5),
        0,
        Math.PI * 2
      );
      ctx.fill();
    });

    // Draw player position
    ctx.beginPath();
    ctx.fillStyle = COLORS.player;
    ctx.arc(
      playerPosition.x * scale,
      playerPosition.y * scale,
      3,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }, [playerPosition, visiblePlayers, viewport, worldSize, size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to get canvas context');
      return;
    }

    try {
      drawMap(ctx);
    } catch (error) {
      console.error('Error drawing minimap:', error);
    }
  }, [drawMap]);

  return (
    <div className="bg-black/50 rounded-lg p-2 backdrop-blur-sm">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
};

export const MiniMap = memo(({ ...props }: MiniMapProps) => (
  <BlobErrorBoundary id="minimap">
    <MiniMapComponent {...props} />
  </BlobErrorBoundary>
)); 