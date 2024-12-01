import React, { useEffect, useRef } from 'react';
import { Container, Graphics } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { PowerUpType } from '../types/powerups';

interface Props {
  activeEffects: PowerUpType[];
  size: number;
  showCollectEffect?: boolean;
  showActivateEffect?: boolean;
}

export const PowerUpEffects: React.FC<Props> = ({ 
  activeEffects, 
  size,
  showCollectEffect = false,
  showActivateEffect = false
}) => {
  const particlesRef = useRef<PIXI.Graphics[]>([]);

  useEffect(() => {
    return () => {
      particlesRef.current.forEach(particle => {
        if (particle && !particle.destroyed) {
          particle.destroy();
        }
      });
      particlesRef.current = [];
    };
  }, []);

  const getEffectColor = (type: PowerUpType): number => {
    switch (type) {
      case PowerUpType.SPEED:
        return 0xffdd00;
      case PowerUpType.SHIELD:
        return 0x00ff00;
      case PowerUpType.MASS:
        return 0xff00ff;
      case PowerUpType.GHOST:
        return 0x808080;
      case PowerUpType.SPLIT:
        return 0xff8800;
      default:
        return 0xffffff;
    }
  };

  const renderEffect = (type: PowerUpType) => {
    switch (type) {
      case PowerUpType.SHIELD:
        return (
          <Graphics
            draw={(g: PIXI.Graphics) => {
              g.clear();
              g.lineStyle(2, getEffectColor(type), 0.5);
              g.drawCircle(0, 0, size / 2);
            }}
          />
        );

      case PowerUpType.SPEED:
        return (
          <Graphics
            draw={(g: PIXI.Graphics) => {
              g.clear();
              g.beginFill(getEffectColor(type), 0.3);
              g.moveTo(-size/4, 0);
              g.lineTo(size/4, 0);
              g.lineTo(0, size/2);
              g.closePath();
              g.endFill();
            }}
          />
        );

      case PowerUpType.MASS:
        return (
          <Graphics
            draw={(g: PIXI.Graphics) => {
              g.clear();
              g.lineStyle(2, getEffectColor(type), 0.5);
              g.drawCircle(0, 0, size * 0.6);
              g.drawCircle(0, 0, size * 0.8);
            }}
          />
        );

      case PowerUpType.GHOST:
        return (
          <Graphics
            draw={(g: PIXI.Graphics) => {
              g.clear();
              g.beginFill(getEffectColor(type), 0.3);
              g.drawCircle(0, 0, size * 0.7);
              g.endFill();
            }}
          />
        );

      case PowerUpType.SPLIT:
        return (
          <Graphics
            draw={(g: PIXI.Graphics) => {
              g.clear();
              g.lineStyle(2, getEffectColor(type), 0.5);
              g.moveTo(-size/3, -size/3);
              g.lineTo(size/3, size/3);
              g.moveTo(-size/3, size/3);
              g.lineTo(size/3, -size/3);
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Container sortableChildren>
      {activeEffects.map((effect, index) => (
        <Container key={`${effect}-${index}`} zIndex={index}>
          {renderEffect(effect)}
        </Container>
      ))}

      {showCollectEffect && (
        <Graphics
          draw={(g: PIXI.Graphics) => {
            g.clear();
            g.lineStyle(2, 0xffffff, 0.8);
            g.drawCircle(0, 0, size * 0.6);
          }}
          zIndex={activeEffects.length}
        />
      )}

      {showActivateEffect && (
        <Graphics
          draw={(g: PIXI.Graphics) => {
            g.clear();
            g.beginFill(0xffffff, 0.3);
            g.drawCircle(0, 0, size * 0.8);
            g.endFill();
          }}
          zIndex={activeEffects.length + 1}
        />
      )}
    </Container>
  );
}; 