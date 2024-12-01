import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PowerUpType, POWER_UP_PROPERTIES } from '../types/powerups';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const PowerUpTutorial: React.FC<Props> = ({ visible, onClose }) => {
  const [hasSeenTutorial, setHasSeenTutorial] = useLocalStorage('hasSeenPowerUpTutorial', false);

  const handleClose = () => {
    setHasSeenTutorial(true);
    onClose();
  };

  if (hasSeenTutorial && !visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 flex justify-center items-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-4xl w-[90%] text-white relative"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Power-Ups Guide</h2>
              <p className="text-white/80">Collect power-ups to enhance your blob!</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Object.entries(POWER_UP_PROPERTIES).map(([type, props]) => (
                <motion.div
                  key={type}
                  whileHover={{ y: -5 }}
                  className="bg-black/50 rounded-xl p-5 border border-white/10 hover:border-white/30 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xl"
                      style={{ backgroundColor: `#${props.color.toString(16)}` }}
                    >
                      {props.icon}
                    </div>
                    <h3 className="font-bold">{props.name}</h3>
                  </div>
                  <p className="text-sm text-white/90 mb-3">{props.description}</p>
                  <div className="text-xs text-white/60 space-y-1">
                    <p>Duration: {props.duration / 1000}s</p>
                    {props.stackable && (
                      <p>Stackable up to {props.maxStacks || 1} times</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
            
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-3xl text-white/60 hover:text-white transition-colors"
            >
              ×
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PowerUpTutorial; 