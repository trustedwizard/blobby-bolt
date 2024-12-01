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
  background: rgba(0, 0, 0, 0.9);
  display: ${props => props.visible ? 'flex' : 'none'};
  justify-content: center;
  align-items: center;
  z-index: 1100;
`;

const TutorialContent = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 30px;
  max-width: 800px;
  width: 90%;
  color: white;
  backdrop-filter: blur(10px);
`;

const ComboGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin: 20px 0;
`;

const ComboCard = styled.div`
  background: rgba(0, 0, 0, 0.5);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.2s;
  
  &:hover {
    transform: translateY(-5px);
    border-color: rgba(255, 255, 255, 0.3);
  }
`;

const ComboTitle = styled.h3`
  color: #ffdd00;
  margin: 0 0 10px 0;
`;

const ComboPowerUps = styled.div`
  display: flex;
  gap: 10px;
  margin: 10px 0;
`;

const PowerUpIcon = styled.div<{ color: string }>`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background-color: ${props => props.color};
`;

const BonusEffect = styled.div`
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-style: italic;
  color: #00ff00;
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
    color: #ffdd00;
  }
`;

const TutorialHeader = styled.div`
  text-align: center;
  margin-bottom: 30px;
`;

interface Props {
  visible: boolean;
  onClose: () => void;
}

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
          <h2>Power-Up Combos</h2>
          <p>Combine power-ups to create powerful effects!</p>
        </TutorialHeader>
        
        <ComboGrid>
          {Object.entries(POWER_UP_COMBOS).map(([key, combo]) => (
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
          Collect and activate power-ups in the right combination to trigger these effects!
        </p>
        
        <CloseButton onClick={handleClose}>×</CloseButton>
      </TutorialContent>
    </TutorialOverlay>
  );
}; 