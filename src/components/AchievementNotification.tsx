import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ComboAchievement } from '../types/achievements';

interface AchievementEvent extends CustomEvent {
  detail: ComboAchievement;
}

export const AchievementNotification: React.FC = () => {
  const [achievements, setAchievements] = useState<ComboAchievement[]>([]);

  useEffect(() => {
    const handleAchievement = (event: AchievementEvent) => {
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
    <div className="fixed top-5 right-5 z-50 pointer-events-none">
      <AnimatePresence>
        {achievements.map(achievement => (
          <motion.div
            key={achievement.id}
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 100 }}
            className="bg-black/90 border-2 border-yellow-400 rounded-lg p-4 mb-3 max-w-[300px] backdrop-blur-sm
                     shadow-[0_0_10px_rgba(255,221,0,0.5)] animate-pulse"
          >
            <div className="font-bold text-yellow-400 mb-1">
              🏆 {achievement.name}
            </div>
            <div className="text-white">
              {achievement.description}
            </div>
            {achievement.reward && (
              <div className="mt-1 text-green-400 italic">
                Reward: {achievement.reward}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}; 