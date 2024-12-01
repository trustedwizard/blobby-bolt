import React, { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { ComboAchievement } from '../types/achievements';

const slideIn = keyframes`
  0% { transform: translateX(120%); }
  10% { transform: translateX(0); }
  90% { transform: translateX(0); }
  100% { transform: translateX(120%); }
`;

const glow = keyframes`
  0% { box-shadow: 0 0 5px #ffdd00; }
  50% { box-shadow: 0 0 20px #ffdd00; }
  100% { box-shadow: 0 0 5px #ffdd00; }
`;

const NotificationContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1200;
  pointer-events: none;
`;

const Achievement = styled.div`
  background: rgba(0, 0, 0, 0.9);
  border: 2px solid #ffdd00;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 10px;
  color: white;
  animation: ${slideIn} 5s forwards, ${glow} 2s infinite;
  backdrop-filter: blur(5px);
  max-width: 300px;
`;

const AchievementTitle = styled.div`
  font-weight: bold;
  color: #ffdd00;
  margin-bottom: 5px;
`;

const AchievementReward = styled.div`
  margin-top: 5px;
  color: #00ff00;
  font-style: italic;
`;

export const AchievementNotification: React.FC = () => {
  const [achievements, setAchievements] = useState<ComboAchievement[]>([]);

  useEffect(() => {
    const handleAchievement = (event: CustomEvent<ComboAchievement>) => {
      setAchievements(prev => [...prev, event.detail]);
      setTimeout(() => {
        setAchievements(prev => prev.filter(a => a.id !== event.detail.id));
      }, 5000);
    };

    window.addEventListener('achievement-unlocked', handleAchievement as EventListener);
    return () => {
      window.removeEventListener('achievement-unlocked', handleAchievement as EventListener);
    };
  }, []);

  return (
    <NotificationContainer>
      {achievements.map(achievement => (
        <Achievement key={achievement.id}>
          <AchievementTitle>🏆 {achievement.name}</AchievementTitle>
          <div>{achievement.description}</div>
          {achievement.reward && (
            <AchievementReward>
              Reward: {achievement.reward}
            </AchievementReward>
          )}
        </Achievement>
      ))}
    </NotificationContainer>
  );
}; 