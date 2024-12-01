import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { POWER_UP_COMBOS, PowerUpType } from '../types/powerups';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const POWER_UP_COLORS: Record<PowerUpType, string> = {
  [PowerUpType.SPEED]: 'bg-yellow-400',
  [PowerUpType.SHIELD]: 'bg-green-400',
  [PowerUpType.MASS]: 'bg-purple-400',
  [PowerUpType.GHOST]: 'bg-gray-400',
  [PowerUpType.SPLIT]: 'bg-blue-400'
};

export const ComboTutorial: React.FC<Props> = ({ visible, onClose }) => {
  const [hasSeenTutorial, setHasSeenTutorial] = useLocalStorage('hasSeenComboTutorial', false);

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
              <h2 className="text-2xl font-bold mb-2">Power-Up Combos</h2>
              <p className="text-white/80">Combine power-ups to create powerful effects!</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Object.entries(POWER_UP_COMBOS).map(([key, combo]) => (
                <motion.div key={key}>
                  <h3 className="text-yellow-400 font-bold mb-3">{combo.name}</h3>
                  <div className="flex gap-3 mb-3">
                    {combo.types.map((type, index) => (
                      <div
                        key={index}
                        className={`w-8 h-8 rounded-full ${POWER_UP_COLORS[type]}`}
                        title={type}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-white/90 mb-3">{combo.description}</p>
                  <p className="text-sm italic text-green-400 pt-3 border-t border-white/10">
                    {combo.bonusEffect.type}
                  </p>
                </motion.div>
              ))}
            </div>
            
            <p className="text-center mt-6 text-white/80">
              Collect and activate power-ups in the right combination to trigger these effects!
            </p>
            
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