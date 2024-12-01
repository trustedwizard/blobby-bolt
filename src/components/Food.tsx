import { Container, Graphics } from '@pixi/react';
import { memo, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { BlobErrorBoundary } from './BlobErrorBoundary';

type FoodType = 'normal' | 'power' | 'ejected';

interface FoodProps {
  id: string;
  x: number;
  y: number;
  color: number;
  size: number;
  type: FoodType;
  splitVelocity?: { x: number; y: number };
}

interface DrawFoodOptions {
  g: PIXI.Graphics;
  color: number;
  size: number;
  type: FoodType;
  splitVelocity?: { x: number; y: number };
}

const drawEjectedFood = ({ g, color, size, splitVelocity }: DrawFoodOptions) => {
  if (splitVelocity) {
    const velocityMagnitude = Math.hypot(splitVelocity.x, splitVelocity.y);
    const blurLength = Math.min(size * 2, velocityMagnitude);
    const angle = Math.atan2(splitVelocity.y, splitVelocity.x);
    
    g.beginFill(color, 0.3);
    g.drawEllipse(
      -Math.cos(angle) * blurLength / 2,
      -Math.sin(angle) * blurLength / 2,
      blurLength,
      size
    );
    g.endFill();
  }

  g.beginFill(color, 0.8);
  g.drawCircle(0, 0, size);
  g.endFill();
  
  g.beginFill(0xFFFFFF, 0.6);
  g.drawCircle(-size/4, -size/4, size/4);
  g.endFill();
};

const drawPowerFood = ({ g, color, size }: DrawFoodOptions) => {
  g.beginFill(color, 0.3);
  g.drawCircle(0, 0, size * 1.8);
  g.endFill();
  
  g.beginFill(color);
  const points = Array.from({ length: 5 }, (_, i) => {
    const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    return [
      Math.cos(angle) * size,
      Math.sin(angle) * size
    ];
  }).flat();
  g.drawPolygon(points);
  g.endFill();
  
  g.beginFill(0xFFFFFF, 0.6);
  g.drawCircle(-size/3, -size/3, size/3);
  g.endFill();
};

const drawNormalFood = ({ g, color, size }: DrawFoodOptions) => {
  g.beginFill(color, 0.3);
  g.drawCircle(0, 0, size * 1.5);
  g.endFill();
  
  g.beginFill(color);
  g.drawCircle(0, 0, size);
  g.endFill();
  
  g.beginFill(0xFFFFFF, 0.4);
  g.drawCircle(-size/3, -size/3, size/3);
  g.endFill();
};

const FoodComponent = ({ x, y, color, size, type, splitVelocity }: FoodProps) => {
  const drawFood = useCallback((g: PIXI.Graphics) => {
    if (!g) return;
    
    g.clear();
    const options = { g, color, size, type, splitVelocity };
    
    switch (type) {
      case 'ejected':
        drawEjectedFood(options);
        break;
      case 'power':
        drawPowerFood(options);
        break;
      default:
        drawNormalFood(options);
    }
  }, [color, size, type, splitVelocity]);

  return (
    <Container position={[x, y]} sortableChildren={true}>
      <Graphics draw={drawFood} zIndex={1} />
    </Container>
  );
};

export const Food = memo(({ id, ...props }: FoodProps) => (
  <BlobErrorBoundary id={`food-${id}`}>
    <FoodComponent {...props} id={id} />
  </BlobErrorBoundary>
));
