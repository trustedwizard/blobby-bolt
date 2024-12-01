import { Graphics } from '@pixi/react';
import { memo, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { BlobErrorBoundary } from './BlobErrorBoundary';

interface GridProps {
  width: number;
  height: number;
  cellSize?: number;
  color?: number;
  alpha?: number;
  zIndex?: number;
}

const DEFAULT_PROPS = {
  cellSize: 50,
  color: 0x333333,
  alpha: 0.3,
  zIndex: 0
} as const;

const GridComponent = ({ 
  width, 
  height, 
  cellSize = DEFAULT_PROPS.cellSize,
  color = DEFAULT_PROPS.color,
  alpha = DEFAULT_PROPS.alpha,
  zIndex = DEFAULT_PROPS.zIndex
}: GridProps) => {
  const draw = useCallback((g: PIXI.Graphics) => {
    if (!g || width <= 0 || height <= 0 || cellSize <= 0) return;

    g.clear();
    g.lineStyle(1, color, alpha);

    // Draw vertical lines
    for (let x = 0; x <= width; x += cellSize) {
      g.moveTo(x, 0);
      g.lineTo(x, height);
    }

    // Draw horizontal lines
    for (let y = 0; y <= height; y += cellSize) {
      g.moveTo(0, y);
      g.lineTo(width, y);
    }
  }, [width, height, cellSize, color, alpha]);

  return <Graphics draw={draw} zIndex={zIndex} />;
};

export const Grid = memo(({ width, height, ...props }: GridProps) => (
  <BlobErrorBoundary id="grid">
    <GridComponent width={width} height={height} {...props} />
  </BlobErrorBoundary>
));
