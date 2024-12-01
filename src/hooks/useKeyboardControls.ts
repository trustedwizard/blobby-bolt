import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export const useKeyboardControls = () => {
  const activePowerUps = useGameStore(state => state.activePowerUps);
  const activatePowerUp = useGameStore(state => state.activatePowerUp);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Use number keys 1-2 for power-up activation
      if (e.key >= '1' && e.key <= '2') {
        const index = parseInt(e.key) - 1;
        const powerUp = activePowerUps[index];
        if (powerUp) {
          activatePowerUp(powerUp.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activePowerUps, activatePowerUp]);
}; 