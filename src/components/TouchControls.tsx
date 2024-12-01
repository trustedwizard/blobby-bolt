import React from 'react';
import { useGameStore } from '../store/gameStore';

const TouchControls: React.FC = () => {
  const { splitBlob, ejectMass } = useGameStore();

  return (
    <div className="fixed bottom-20 right-4 flex flex-col gap-4 touch-none">
      <button className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm active:bg-white/30 border-2 border-white/30 text-white font-bold" onClick={splitBlob}>SPLIT</button>
      <button className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm active:bg-white/30 border-2 border-white/30 text-white font-bold" onClick={ejectMass}>EJECT</button>
    </div>
  );
};

export default TouchControls; 