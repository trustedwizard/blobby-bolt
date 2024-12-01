import React from 'react';
import { PowerUpBase, PowerUpType } from '../types/powerups';
import styled from 'styled-components';

const PowerUpWrapper = styled.div<{ powerUpType: PowerUpType }>`
  position: absolute;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: pulse 1.5s infinite;
  
  ${({ powerUpType }) => {
    switch (powerUpType) {
      case PowerUpType.SPEED:
        return 'background: #ffdd00;';
      case PowerUpType.SHIELD:
        return 'background: #00ff00;';
      case PowerUpType.MASS:
        return 'background: #ff00ff;';
      case PowerUpType.GHOST:
        return 'background: #808080;';
      case PowerUpType.SPLIT:
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
  powerUp: PowerUpBase;
}

export const PowerUp: React.FC<Props> = ({ powerUp }) => {
  return (
    <PowerUpWrapper
      powerUpType={powerUp.powerUpType}
      style={{
        left: powerUp.x,
        top: powerUp.y
      }}
    />
  );
}; 