import React from 'react';
import styled from 'styled-components';
import { comboStatsService } from '../services/comboStatsService';
import { POWER_UP_COMBOS } from '../types/powerups';

const ChartContainer = styled.div`
  position: fixed;
  right: 20px;
  bottom: 100px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 12px;
  padding: 15px;
  color: white;
  width: 300px;
`;

const BarChart = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
`;

const Bar = styled.div<{ width: number; color: string }>`
  height: 20px;
  width: ${props => props.width}%;
  background: ${props => props.color};
  border-radius: 4px;
  transition: width 0.3s ease;
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.1) 0%,
      rgba(255, 255, 255, 0.2) 50%,
      rgba(255, 255, 255, 0.1) 100%
    );
  }
`;

const Label = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
`;

const ChartTitle = styled.h4`
  margin: 0 0 15px 0;
  text-align: center;
`;

export const ComboStatsChart: React.FC = () => {
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

  const maxActivations = Math.max(
    ...stats.map(s => s.stats?.totalActivations || 0)
  );

  const getBarColor = (comboType: string): string => {
    switch (comboType) {
      case 'SPEED_SHIELD': return 'linear-gradient(90deg, #ffdd00, #00ff00)';
      case 'MAGNET_GRAVITY': return 'linear-gradient(90deg, #ff00ff, #0000ff)';
      case 'TELEPORT_SPLIT': return 'linear-gradient(90deg, #ff0000, #ff8800)';
      default: return '#ffffff';
    }
  };

  return (
    <ChartContainer>
      <ChartTitle>Combo Usage Statistics</ChartTitle>
      <BarChart>
        {stats.map(({ type, stats }) => {
          if (!stats) return null;
          const combo = POWER_UP_COMBOS[type as keyof typeof POWER_UP_COMBOS];
          const percentage = (stats.totalActivations / maxActivations) * 100 || 0;
          
          return (
            <div key={type}>
              <Label>
                <span>{combo.name}</span>
                <span>{stats.totalActivations}</span>
              </Label>
              <Bar 
                width={percentage} 
                color={getBarColor(type)}
              />
            </div>
          );
        })}
      </BarChart>
    </ChartContainer>
  );
}; 