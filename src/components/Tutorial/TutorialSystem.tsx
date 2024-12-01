import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { TutorialStep as TutorialStepComponent } from '../Tutorial/TutorialStep';

interface TutorialState {
  currentStep: number;
  completed: boolean;
  steps: TutorialStep[];
}

export interface TutorialStep {
  id: number;
  title: string;
  description: string;
  action: string;
  condition: () => boolean;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: "Movement",
    description: "Move your blob using the mouse or arrow keys",
    action: "Try moving around",
    condition: () => {
      const { player } = useGameStore.getState();
      return (player?.trail?.length ?? 0) > 5;
    }
  },
  {
    id: 2,
    title: "Eating Food",
    description: "Collect food pellets to grow bigger",
    action: "Eat 5 food pellets",
    condition: () => {
      const { player } = useGameStore.getState();
      return (player?.score || 0) >= 5;
    }
  },
  {
    id: 3,
    title: "Power-ups",
    description: "Collect power-ups for special abilities",
    action: "Collect a power-up",
    condition: () => {
      const { activePowerUps } = useGameStore.getState();
      return activePowerUps.length > 0;
    }
  },
  {
    id: 4,
    title: "Splitting",
    description: "Press SPACE to split your blob",
    action: "Split your blob",
    condition: () => {
      const { blobs, player } = useGameStore.getState();
      return blobs.filter(b => b.parentId === player?.id).length > 0;
    }
  },
  {
    id: 5,
    title: "Team Play",
    description: "Join a team to play cooperatively",
    action: "Join a team",
    condition: () => {
      const { currentTeam } = useGameStore.getState();
      return currentTeam !== null;
    }
  }
];

export const TutorialSystem: React.FC = () => {
  const [tutorialState, setTutorialState] = useState<TutorialState>({
    currentStep: 0,
    completed: false,
    steps: tutorialSteps
  });

  useEffect(() => {
    if (tutorialState.completed) return;

    const checkStepCompletion = () => {
      const currentStep = tutorialSteps[tutorialState.currentStep];
      if (currentStep?.condition()) {
        setTutorialState(prev => ({
          ...prev,
          currentStep: prev.currentStep + 1,
          completed: prev.currentStep + 1 >= tutorialSteps.length
        }));
      }
    };

    // Reduce check frequency to improve performance
    const interval = setInterval(checkStepCompletion, 2000);
    return () => clearInterval(interval);
  }, [tutorialState.currentStep, tutorialState.completed]);

  if (tutorialState.completed) return null;

  const currentStep = tutorialSteps[tutorialState.currentStep];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-black/80 rounded-lg p-4 text-white"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
      >
        <TutorialStepComponent
          step={currentStep}
          total={tutorialSteps.length}
          onSkip={() => setTutorialState(prev => ({ ...prev, completed: true }))}
        />
      </motion.div>
    </AnimatePresence>
  );
}; 