import React from 'react';
import { PowerUp as PowerUpInterface } from '../types/powerups';
import styled from 'styled-components';

const PowerUpWrapper = styled.div<{ powerUpType: string }>`
  position: absolute;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: pulse 1.5s infinite;
  
  ${({ powerUpType }) => {
    switch (powerUpType) {
      case 'SPEED_BOOST':
        return 'background: #ffdd00;';
      case 'SHIELD':
        return 'background: #00ff00;';
      case 'BLOB_MAGNET':
        return 'background: #ff00ff;';
      case 'GRAVITY_PULSE':
        return 'background: #0000ff;';
      case 'TELEPORT':
        return 'background: #ff0000;';
      case 'SPLIT_BOMB':
        return 'background: #ff8800;';
      default:
        return 'background: #cccccc;';
    }
  }}

  @keyframes pulse {
    0% { transform: translate(-50%, -50%) scale(1); }
    50% { transform: translate(-50%, -50%) scale(1.2); }
    100% { transform: translate(-50%, -50%) scale(1); }
  }
`;

interface Props {
  powerUp: PowerUpInterface;
}

export const PowerUp: React.FC<Props> = ({ powerUp }) => {
  return (
    <PowerUpWrapper
      powerUpType={powerUp.type}
      style={{
        left: powerUp.position.x,
        top: powerUp.position.y
      }}
    />
  );
}; 