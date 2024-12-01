import React, { useCallback, useMemo } from 'react';
import { Container, Text, Graphics } from '@pixi/react';
import { TextStyle, Graphics as PIXIGraphics } from 'pixi.js';
import { PowerUpEffects } from './PowerUpEffects';
import { useGameStore } from '../store/gameStore';
import { PowerUpType, POWER_UP_TYPES } from '../types/powerups';
import { Position, Velocity } from '../types/common';
import { BlobErrorBoundary } from './BlobErrorBoundary';

interface BlobProps {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: number;
  name: string;
  emoji?: string;
  trail: Position[];
  showActivateEffect?: boolean;
  showCollectEffect?: boolean;
}

const nameStyle = new TextStyle({
  fontFamily: 'Arial',
  fontSize: 14,
  fill: 0xFFFFFF,
  align: 'center',
  fontWeight: 'bold',
  dropShadow: true,
  dropShadowColor: 0x000000,
  dropShadowBlur: 2,
  dropShadowDistance: 1
});

const emojiStyle = new TextStyle({
  fontFamily: 'Arial',
  fontSize: 20,
  align: 'center'
});

export const Blob: React.FC<BlobProps> = React.memo(({
  id,
  x,
  y,
  radius,
  color,
  name,
  emoji = '😊',
  trail,
  showActivateEffect = false,
  showCollectEffect = false
}) => {
  const activePowerUps = useGameStore(state => 
    state.activePowerUps.filter(p => p.id.startsWith(id))
  );

  const velocity = useGameStore(state => {
    const blob = Array.from(state.players.values()).find(b => b.id === id);
    return blob?.velocity;
  });

  const activeEffects = useMemo(() => 
    activePowerUps.map(p => p.type as PowerUpType),
    [activePowerUps]
  );

  const hasSpeedBoost = activeEffects.includes(POWER_UP_TYPES.SPEED);
  const finalRadius = radius * (hasSpeedBoost ? 0.9 : 1);

  const getDeformation = useCallback((vel: Velocity | undefined) => {
    if (!vel) return { scaleX: 1, scaleY: 1, rotation: 0 };

    const speed = Math.hypot(vel.x, vel.y);
    const maxDeform = 0.2;
    const deform = Math.min(speed / 10, maxDeform);
    const angle = Math.atan2(vel.y, vel.x);
    
    return {
      scaleX: 1 + Math.cos(angle) * deform,
      scaleY: 1 + Math.sin(angle) * deform,
      rotation: angle
    };
  }, []);

  const deformation = useMemo(() => 
    getDeformation(velocity),
    [velocity, getDeformation]
  );

  const renderTrail = useCallback((pos: Position, index: number) => (
    <Container 
      key={index}
      position={[pos.x - x, pos.y - y]}
      alpha={1 - index / trail.length}
      scale={[deformation.scaleX, deformation.scaleY]}
      rotation={deformation.rotation}
    >
      <Graphics
        draw={(g: PIXIGraphics) => {
          g.clear();
          g.beginFill(color, 0.2);
          g.drawCircle(0, 0, finalRadius * 2 * (1 - index / trail.length));
          g.endFill();
        }}
      />
    </Container>
  ), [x, y, deformation, color, finalRadius, trail.length]);

  return (
    <BlobErrorBoundary>
      <Container position={[x, y]}>
        {trail.map(renderTrail)}

        <Container
          scale={[deformation.scaleX, deformation.scaleY]}
          rotation={deformation.rotation}
        >
          <Graphics
            draw={(g: PIXIGraphics) => {
              g.clear();
              g.beginFill(color);
              g.drawCircle(0, 0, finalRadius);
              g.endFill();
            }}
          />

          <Text
            text={emoji}
            anchor={0.5}
            style={emojiStyle}
          />
        </Container>

        <Text
          text={name}
          anchor={0.5}
          y={finalRadius + 20}
          style={nameStyle}
        />

        <PowerUpEffects 
          activeEffects={activeEffects}
          size={finalRadius * 2}
          showCollectEffect={showCollectEffect}
          showActivateEffect={showActivateEffect}
        />
      </Container>
    </BlobErrorBoundary>
  );
});