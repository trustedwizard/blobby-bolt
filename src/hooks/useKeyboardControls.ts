import { useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';

interface GameControls {
  split: () => void;
  eject: () => void;
  boost: (active: boolean) => void;
  activatePowerUp: (id: string) => void;
}

type ValidKeyCodes = 'Space' | 'KeyW' | 'KeyX' | 'KeyQ';
type PowerUpKeys = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

/**
 * Hook to handle keyboard controls for the game
 * Manages key bindings for:
 * - Space: Split blob
 * - W: Toggle boost
 * - X/Q: Eject mass
 * - 1-9: Activate power-ups
 */
export const useKeyboardControls = (): void => {
  const {
    activePowerUps,
    activatePowerUp,
    splitBlob,
    ejectMass,
    setBoost
  } = useGameStore(state => ({
    activePowerUps: state.activePowerUps,
    activatePowerUp: state.activatePowerUp,
    splitBlob: state.splitBlob,
    ejectMass: state.ejectMass,
    setBoost: state.setBoost
  }));

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const code = e.code as ValidKeyCodes;
    const key = e.key as PowerUpKeys;

    switch (code) {
      case 'Space':
        e.preventDefault();
        splitBlob();
        break;
      case 'KeyW':
        e.preventDefault();
        setBoost(true);
        break;
      case 'KeyX':
      case 'KeyQ':
        e.preventDefault();
        ejectMass();
        break;
      default:
        // Use number keys 1-9 for power-up activation
        if (key >= '1' && key <= '9') {
          e.preventDefault();
          const index = parseInt(key) - 1;
          const powerUp = activePowerUps[index];
          if (powerUp) {
            activatePowerUp(powerUp.id);
          }
        }
    }
  }, [activePowerUps, activatePowerUp, splitBlob, ejectMass, setBoost]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const code = e.code as ValidKeyCodes;
    
    switch (code) {
      case 'KeyW':
        e.preventDefault();
        setBoost(false);
        break;
    }
  }, [setBoost]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
}; 