import React, { useCallback } from 'react';
import { Container, Text, Graphics } from '@pixi/react';
import { TextStyle, Graphics as PIXIGraphics } from 'pixi.js';
import { PowerUpEffects } from './PowerUpEffects';
import { useGameStore } from '../store/gameStore';
import { PowerUpType } from '../types/powerups';
import { Position } from '../types/common';
import { BlobErrorBoundary } from './BlobErrorBoundary';

interface BlobProps {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: number;
  name: string;
  emoji: string;
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

export const Blob: React.FC<BlobProps> = ({
  id,
  x,
  y,
  radius,
  color,
  name,
  emoji,
  trail,
  showActivateEffect = false,
  showCollectEffect = false
}) => {
  const activePowerUps = useGameStore(state => 
    state.activePowerUps.filter(p => p.playerId === id)
  );

  // Get blob's velocity from store
  const blob = useGameStore(state => 
    state.blobs.find(b => b.id === id)
  );

  const activeEffects = activePowerUps.map(p => p.type);
  const speedBoost = activeEffects.includes(PowerUpType.SPEED_BOOST);
  const finalRadius = radius * (speedBoost ? 0.9 : 1);

  // Calculate deformation based on velocity
  const getDeformation = useCallback((velocity: { x: number, y: number } | undefined) => {
    if (!velocity) return { scaleX: 1, scaleY: 1, rotation: 0 };

    const speed = Math.hypot(velocity.x, velocity.y);
    const maxDeform = 0.2;
    const deform = Math.min(speed / 10, maxDeform);
    
    // Calculate angle for proper squash direction
    const angle = Math.atan2(velocity.y, velocity.x);
    
    return {
      scaleX: 1 + Math.cos(angle) * deform,
      scaleY: 1 + Math.sin(angle) * deform,
      rotation: angle
    };
  }, []);

  // Get current deformation
  const deformation = getDeformation(blob?.velocity);

  return (
    <BlobErrorBoundary>
      <Container position={[x, y]}>
        {/* Trail with deformation */}
        {trail.map((pos, index) => (
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
        ))}

        {/* Main Blob with deformation */}
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

          {/* Emoji */}
          <Text
            text={emoji}
            anchor={0.5}
            style={emojiStyle}
          />
        </Container>

        {/* Name - keep outside deformation */}
        <Text
          text={name}
          anchor={0.5}
          y={finalRadius + 20}
          style={nameStyle}
        />

        {/* Effects */}
        <PowerUpEffects 
          activeEffects={activeEffects}
          size={finalRadius * 2}
          showCollectEffect={showCollectEffect}
          showActivateEffect={showActivateEffect}
        />
      </Container>
    </BlobErrorBoundary>
  );
};