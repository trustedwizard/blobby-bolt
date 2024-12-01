import { Container, Graphics } from '@pixi/react';
import { useCallback } from 'react';
import * as PIXI from 'pixi.js';

interface FoodProps {
  id: string;
  x: number;
  y: number;
  color: number;
  size: number;
  type: 'normal' | 'power' | 'ejected';
  splitVelocity?: { x: number; y: number };
}

export function Food({ x, y, color, size, type, splitVelocity }: FoodProps) {
  const drawFood = useCallback((g: PIXI.Graphics) => {
    if (!g) return;
    
    g.clear();
    
    if (type === 'ejected') {
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
    } else if (type === 'power') {
      g.beginFill(color, 0.3);
      g.drawCircle(0, 0, size * 1.8);
      g.endFill();
      
      g.beginFill(color);
      const points: number[] = [];
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        points.push(
          Math.cos(angle) * size,
          Math.sin(angle) * size
        );
      }
      g.drawPolygon(points);
      g.endFill();
      
      g.beginFill(0xFFFFFF, 0.6);
      g.drawCircle(-size/3, -size/3, size/3);
      g.endFill();
    } else {
      g.beginFill(color, 0.3);
      g.drawCircle(0, 0, size * 1.5);
      g.endFill();
      
      g.beginFill(color);
      g.drawCircle(0, 0, size);
      g.endFill();
      
      g.beginFill(0xFFFFFF, 0.4);
      g.drawCircle(-size/3, -size/3, size/3);
      g.endFill();
    }
  }, [color, size, type, splitVelocity]);

  // Add error boundary wrapper
  try {
    return (
      <Container position={[x, y]} sortableChildren={true}>
        <Graphics draw={drawFood} zIndex={1} />
      </Container>
    );
  } catch (error) {
    console.error('Error rendering food:', error);
    return null;
  }
}
