import React from 'react';
import styled from 'styled-components';
import { POWER_UP_COMBOS, PowerUpType } from '../types/powerups';
import { useLocalStorage } from '../hooks/useLocalStorage';

const TutorialOverlay = styled.div<{ visible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: ${props => props.visible ? 'flex' : 'none'};
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const TutorialContent = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  max-width: 600px;
  color: white;
  backdrop-filter: blur(5px);
`;

const TutorialHeader = styled.div`
  text-align: center;
  margin-bottom: 20px;
`;

const ComboGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin: 20px 0;
`;

const ComboCard = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
`;

const ComboTitle = styled.h3`
  text-align: center;
`;

const ComboPowerUps = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
`;

const PowerUpIcon = styled.div<{ color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${props => props.color};
`;

const CloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  
  &:hover {
    color: #ddd;
  }
`;

const BonusEffect = styled.div`
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-style: italic;
  color: #00ff00;
`;

const getPowerUpColor = (type: PowerUpType): string => {
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
};

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface PowerUpComboEntry {
  name: string;
  types: PowerUpType[];
  description: string;
  bonusEffect: string;
}

const getPowerUpDescription = (type: PowerUpType): string => {
  switch (type) {
    case PowerUpType.SPEED_BOOST:
      return "Temporarily increases movement speed";
    case PowerUpType.SHIELD:
      return "Provides temporary immunity from other blobs";
    case PowerUpType.BLOB_MAGNET:
      return "Attracts nearby food pellets";
    case PowerUpType.GRAVITY_PULSE:
      return "Pulls nearby blobs toward you";
    case PowerUpType.TELEPORT:
      return "Instantly teleport to a random location";
    case PowerUpType.SPLIT_BOMB:
      return "Forces nearby blobs to split";
    default:
      return "";
  }
};

export const PowerUpTutorial: React.FC<Props> = ({ visible, onClose }) => {
  const [hasSeenTutorial, setHasSeenTutorial] = useLocalStorage('hasSeenComboTutorial', false);

  const handleClose = () => {
    setHasSeenTutorial(true);
    onClose();
  };

  if (hasSeenTutorial && !visible) return null;

  return (
    <TutorialOverlay visible={visible}>
      <TutorialContent>
        <TutorialHeader>
          <h2>Power-Ups Guide</h2>
          <p>Master both individual power-ups and their powerful combinations!</p>
        </TutorialHeader>

        {/* Individual Power-ups Section */}
        <h3>Individual Power-ups</h3>
        <ComboGrid>
          {Object.values(PowerUpType).map(type => (
            <ComboCard key={type}>
              <ComboTitle>{type.replace('_', ' ')}</ComboTitle>
              <PowerUpIcon color={getPowerUpColor(type)} title={type} />
              <div>{getPowerUpDescription(type)}</div>
            </ComboCard>
          ))}
        </ComboGrid>

        {/* Power-up Combos Section */}
        <h3 style={{ marginTop: '20px' }}>Power-up Combinations</h3>
        <ComboGrid>
          {Object.entries(POWER_UP_COMBOS).map(([key, combo]: [string, PowerUpComboEntry]) => (
            <ComboCard key={key}>
              <ComboTitle>{combo.name}</ComboTitle>
              <ComboPowerUps>
                {combo.types.map((type, index) => (
                  <PowerUpIcon 
                    key={index} 
                    color={getPowerUpColor(type)} 
                    title={type}
                  />
                ))}
              </ComboPowerUps>
              <div>{combo.description}</div>
              <BonusEffect>{combo.bonusEffect}</BonusEffect>
            </ComboCard>
          ))}
        </ComboGrid>
        
        <p style={{ textAlign: 'center', marginTop: '20px' }}>
          Press 1-2 keys or tap icons to activate collected power-ups!
        </p>
        
        <CloseButton onClick={handleClose}>×</CloseButton>
      </TutorialContent>
    </TutorialOverlay>
  );
}; 