import React, { useEffect, useRef } from 'react';
import { Container, Graphics } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { PowerUpType } from '../types/powerups';
import { useGameStore } from '../store/gameStore';
import { PerformanceManager } from '../systems/PerformanceManager';

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
  const performanceManager = useRef<PerformanceManager | null>(null);
  const particlesRef = useRef<PIXI.Graphics[]>([]);
  const app = useGameStore(state => state.pixiApp);

  useEffect(() => {
    if (app?.renderer instanceof PIXI.Renderer) {
      performanceManager.current = PerformanceManager.getInstance(app.renderer);
    }

    return () => {
      particlesRef.current.forEach(particle => {
        if (particle && !particle.destroyed) {
          particle.destroy();
          performanceManager.current?.releaseParticle(particle);
        }
      });
      particlesRef.current = [];
    };
  }, [app]);

  const getEffectColor = (type: PowerUpType): number => {
    switch (type) {
      case PowerUpType.SPEED_BOOST:
        return 0xffdd00;
      case PowerUpType.SHIELD:
        return 0x00ff00;
      case PowerUpType.BLOB_MAGNET:
        return 0xff00ff;
      case PowerUpType.GRAVITY_PULSE:
        return 0x0000ff;
      case PowerUpType.TELEPORT:
        return 0xff0000;
      case PowerUpType.SPLIT_BOMB:
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

      case PowerUpType.SPEED_BOOST:
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

      case PowerUpType.BLOB_MAGNET:
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

      default:
        return null;
    }
  };

  return (
    <Container sortableChildren>
      {/* Active Effects */}
      {activeEffects.map((effect, index) => (
        <Container key={`${effect}-${index}`} zIndex={index}>
          {renderEffect(effect)}
        </Container>
      ))}

      {/* Collect Effect */}
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

      {/* Activate Effect */}
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