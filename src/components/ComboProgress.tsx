import React from 'react';
import styled from 'styled-components';
import { comboStatsService } from '../services/comboStatsService';
import { POWER_UP_COMBOS, PowerUpCombo } from '../types/powerups';

const ProgressContainer = styled.div`
  position: fixed;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.8);
  border-radius: 12px;
  padding: 15px;
  color: white;
  max-width: 250px;
`;

const ComboEntry = styled.div`
  margin: 10px 0;
`;

const ProgressBar = styled.div<{ progress: number }>`
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
  margin: 5px 0;
  
  &::after {
    content: '';
    display: block;
    width: ${props => props.progress}%;
    height: 100%;
    background: linear-gradient(90deg, #ffdd00, #ff8800);
    transition: width 0.3s ease;
  }
`;

const MasteryBadge = styled.div<{ level: number }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-left: 8px;
  background: ${props => {
    switch (props.level) {
      case 1: return '#cd7f32'; // Bronze
      case 2: return '#c0c0c0'; // Silver
      case 3: return '#ffd700'; // Gold
      case 4: return '#b9f2ff'; // Diamond
      default: return '#ffffff';
    }
  }};
  color: black;
`;

export const ComboProgress: React.FC = () => {
  const [stats, setStats] = React.useState(() => 
    Object.keys(POWER_UP_COMBOS).map(comboType => ({
      type: comboType,
      stats: comboStatsService.getStats(comboType)
    }))
  );

  React.useEffect(() => {
    const updateStats = () => {
      setStats(Object.keys(POWER_UP_COMBOS).map(comboType => ({
        type: comboType,
        stats: comboStatsService.getStats(comboType)
      })));
    };

    window.addEventListener('combo-stats-updated', updateStats);
    return () => window.removeEventListener('combo-stats-updated', updateStats);
  }, []);

  const getMasteryLevel = (activations: number) => {
    if (activations >= 100) return 4; // Diamond
    if (activations >= 50) return 3;  // Gold
    if (activations >= 25) return 2;  // Silver
    if (activations >= 10) return 1;  // Bronze
    return 0;
  };

  const getMasteryTitle = (level: number) => {
    switch (level) {
      case 4: return 'Diamond';
      case 3: return 'Gold';
      case 2: return 'Silver';
      case 1: return 'Bronze';
      default: return 'None';
    }
  };

  return (
    <ProgressContainer>
      <h3>Combo Mastery</h3>
      {stats.map(({ type, stats }) => {
        if (!stats) return null;
        const combo = POWER_UP_COMBOS[type as keyof typeof POWER_UP_COMBOS] as PowerUpCombo;
        const masteryLevel = getMasteryLevel(stats.totalActivations);
        
        return (
          <ComboEntry key={type}>
            <div>
              {combo.name}
              <MasteryBadge level={masteryLevel}>
                {getMasteryTitle(masteryLevel)}
              </MasteryBadge>
            </div>
            <ProgressBar 
              progress={Math.min(100, (stats.totalActivations / 100) * 100)} 
            />
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              Activations: {stats.totalActivations} | 
              Successful: {stats.successfulHits}
            </div>
          </ComboEntry>
        );
      })}
    </ProgressContainer>
  );
}; 