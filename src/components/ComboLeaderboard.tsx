import React from 'react';
import styled from 'styled-components';
import { POWER_UP_COMBOS } from '../types/powerups';

const LeaderboardContainer = styled.div`
  position: fixed;
  right: 20px;
  top: 20px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 12px;
  padding: 15px;
  color: white;
  max-width: 300px;
`;

const LeaderboardEntry = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  &:last-child {
    border-bottom: none;
  }
`;

const PlayerName = styled.div`
  flex: 1;
`;

const ComboCount = styled.div`
  font-weight: bold;
  color: #ffdd00;
`;

const TabButton = styled.button<{ active: boolean }>`
  background: ${props => props.active ? 'rgba(255, 255, 255, 0.2)' : 'transparent'};
  border: none;
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

export const ComboLeaderboard: React.FC = () => {
  const [selectedCombo, setSelectedCombo] = React.useState<string>(
    Object.keys(POWER_UP_COMBOS)[0]
  );
  
  const [leaderboardData, setLeaderboardData] = React.useState<Array<{
    playerName: string;
    count: number;
  }>>([]);

  React.useEffect(() => {
    // In a real implementation, this would fetch from the server
    const mockLeaderboardData = [
      { playerName: 'Player1', count: 50 },
      { playerName: 'Player2', count: 45 },
      { playerName: 'Player3', count: 40 },
      { playerName: 'Player4', count: 35 },
      { playerName: 'Player5', count: 30 },
    ];
    setLeaderboardData(mockLeaderboardData);
  }, [selectedCombo]);

  return (
    <LeaderboardContainer>
      <h3>Combo Leaderboard</h3>
      <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
        {Object.entries(POWER_UP_COMBOS).map(([key, combo]) => (
          <TabButton
            key={key}
            active={selectedCombo === key}
            onClick={() => setSelectedCombo(key)}
          >
            {combo.name}
          </TabButton>
        ))}
      </div>
      {leaderboardData.map((entry, index) => (
        <LeaderboardEntry key={entry.playerName}>
          <div>{index + 1}.</div>
          <PlayerName>{entry.playerName}</PlayerName>
          <ComboCount>{entry.count}</ComboCount>
        </LeaderboardEntry>
      ))}
    </LeaderboardContainer>
  );
}; 