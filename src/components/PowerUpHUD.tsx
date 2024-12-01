import React, { useState } from 'react';
import styled from 'styled-components';
import { PowerUpType } from '../types/powerups';
import { useGameStore } from '../store/gameStore';

const HUDContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  gap: 10px;
  z-index: 1000;
`;

const PowerUpSlot = styled.div<{ active: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 2px solid ${props => props.active ? '#fff' : '#666'};
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #fff;
    transform: scale(1.05);
  }
`;

const PowerUpIcon = styled.div<{ type: PowerUpType }>`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: ${({ type }) => {
    switch (type) {
      case PowerUpType.SPEED_BOOST:
        return '#ffdd00';
      case PowerUpType.SHIELD:
        return '#00ff00';
      case PowerUpType.BLOB_MAGNET:
        return '#ff00ff';
      case PowerUpType.GRAVITY_PULSE:
        return '#0000ff';
      case PowerUpType.TELEPORT:
        return '#ff0000';
      case PowerUpType.SPLIT_BOMB:
        return '#ff8800';
      default:
        return '#ffffff';
    }
  }};
`;

const Timer = styled.div`
  position: absolute;
  bottom: -20px;
  width: 100%;
  text-align: center;
  font-size: 12px;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
`;

const KeyHint = styled.div`
  position: absolute;
  top: -20px;
  width: 100%;
  text-align: center;
  font-size: 12px;
  color: white;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  padding: 2px;
`;

const TouchControls = styled.div`
  position: fixed;
  bottom: 80px;
  right: 20px;
  display: flex;
  gap: 10px;
  z-index: 1000;
  
  @media (min-width: 768px) {
    display: none; // Hide on desktop
  }
`;

const TouchButton = styled.button`
  width: 50px;
  height: 50px;
  border-radius: 25px;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid white;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  transition: background 0.2s ease;
  
  &:active {
    background: rgba(255, 255, 255, 0.4);
  }
`;

const Tooltip = styled.div<{ visible: boolean }>`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  opacity: ${props => props.visible ? 1 : 0};
  transition: opacity 0.2s;
  z-index: 1000;
`;

const ComboIndicator = styled.div<{ active: boolean }>`
  position: absolute;
  top: -5px;
  right: -5px;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: ${props => props.active ? '#ffff00' : 'transparent'};
  border: 2px solid #ffff00;
  animation: ${props => props.active ? 'pulse 1s infinite' : 'none'};

  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.2); opacity: 0.8; }
    100% { transform: scale(1); opacity: 1; }
  }
`;

export const PowerUpHUD: React.FC = () => {
  const { activePowerUps, activatePowerUp, activeCombos, player } = useGameStore(state => ({
    activePowerUps: state.activePowerUps,
    activatePowerUp: state.activatePowerUp,
    activeCombos: state.activeCombos,
    player: state.player
  }));

  const [hoveredPowerUp, setHoveredPowerUp] = useState<string | null>(null);

  const getTooltipText = (type: PowerUpType): string => {
    switch (type) {
      case PowerUpType.SPEED_BOOST:
        return "Speed Boost: Temporarily increases movement speed";
      case PowerUpType.SHIELD:
        return "Shield: Provides temporary immunity";
      case PowerUpType.BLOB_MAGNET:
        return "Magnet: Attracts nearby food";
      case PowerUpType.GRAVITY_PULSE:
        return "Gravity Pulse: Pulls nearby blobs toward you";
      case PowerUpType.TELEPORT:
        return "Teleport: Instantly move to a random location";
      case PowerUpType.SPLIT_BOMB:
        return "Split Bomb: Forces nearby blobs to split";
      default:
        return "";
    }
  };

  const isPartOfCombo = (powerUpType: PowerUpType): boolean => {
    return activeCombos.some(combo => 
      combo.playerId === player?.id && 
      combo.types.includes(powerUpType)
    );
  };

  return (
    <>
      <HUDContainer>
        {activePowerUps.map((powerUp, index) => (
          <PowerUpSlot 
            key={powerUp.id} 
            active={true}
            onClick={() => activatePowerUp(powerUp.id)}
            onMouseEnter={() => setHoveredPowerUp(powerUp.id)}
            onMouseLeave={() => setHoveredPowerUp(null)}
          >
            <KeyHint>{index + 1}</KeyHint>
            <PowerUpIcon type={powerUp.type} />
            <ComboIndicator active={isPartOfCombo(powerUp.type)} />
            <Timer>
              {Math.max(0, Math.ceil((powerUp.expiresAt - Date.now()) / 1000))}s
            </Timer>
            <Tooltip visible={hoveredPowerUp === powerUp.id}>
              {getTooltipText(powerUp.type)}
              {isPartOfCombo(powerUp.type) && (
                <div style={{ marginTop: '5px', color: '#ffff00' }}>
                  Part of active combo!
                </div>
              )}
            </Tooltip>
          </PowerUpSlot>
        ))}
        {/* Empty slots */}
        {Array.from({ length: Math.max(0, 2 - activePowerUps.length) }).map((_, i) => (
          <PowerUpSlot key={`empty-${i}`} active={false}>
            <KeyHint>{activePowerUps.length + i + 1}</KeyHint>
          </PowerUpSlot>
        ))}
      </HUDContainer>
      
      {/* Touch Controls */}
      <TouchControls>
        {activePowerUps.map((powerUp, index) => (
          <TouchButton
            key={powerUp.id}
            onClick={() => activatePowerUp(powerUp.id)}
          >
            {index + 1}
          </TouchButton>
        ))}
      </TouchControls>
    </>
  );
}; 