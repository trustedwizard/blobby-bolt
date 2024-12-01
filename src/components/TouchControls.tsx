import React, { memo } from 'react';
import { useGameStore } from '../store/gameStore';

const TouchControls = memo(() => {
  const { splitBlob, ejectMass } = useGameStore();

  return (
    <div 
      className="fixed bottom-20 right-4 flex flex-col gap-4 touch-none"
      role="group"
      aria-label="Game Controls"
    >
      <button 
        className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm active:scale-95 active:bg-white/30 border-2 border-white/30 text-white font-bold transition-all touch-manipulation"
        onClick={splitBlob}
        aria-label="Split blob"
      >
        SPLIT
      </button>
      <button 
        className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm active:scale-95 active:bg-white/30 border-2 border-white/30 text-white font-bold transition-all touch-manipulation"
        onClick={ejectMass}
        aria-label="Eject mass"
      >
        EJECT
      </button>
    </div>
  );
});

TouchControls.displayName = 'TouchControls';

export default TouchControls; 