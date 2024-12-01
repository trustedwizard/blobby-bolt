import React from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { soundService } from '../services/soundService';
import { motion } from 'framer-motion';

interface GameSettings {
  soundEnabled: boolean;
  hapticEnabled: boolean;
  volume: number;
}

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  hapticEnabled: true,
  volume: 0.5
};

const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}> = ({ checked, onChange, disabled }) => (
  <label className="relative inline-block w-14 h-8">
    <input
      type="checkbox"
      className="opacity-0 w-0 h-0"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
    />
    <span className={`
      absolute cursor-pointer inset-0 
      rounded-full transition-colors duration-300
      ${checked ? 'bg-blue-500' : 'bg-gray-400'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      before:content-[''] before:absolute before:w-6 before:h-6 
      before:left-1 before:bottom-1 before:bg-white before:rounded-full
      before:transition-transform before:duration-300
      ${checked ? 'before:translate-x-6' : 'before:translate-x-0'}
    `} />
  </label>
);

const VolumeSlider: React.FC<{
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => (
  <input
    type="range"
    min="0"
    max="1"
    step="0.1"
    value={value}
    onChange={onChange}
    disabled={disabled}
    className={`
      w-24 h-1 rounded-full appearance-none bg-gray-400
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      focus:outline-none focus:ring-2 focus:ring-blue-500
      [&::-webkit-slider-thumb]:appearance-none
      [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500
      [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
      [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500
      [&::-moz-range-thumb]:border-0
    `}
  />
);

export const GameSettings: React.FC = () => {
  const [settings, setSettings] = useLocalStorage<GameSettings>('gameSettings', DEFAULT_SETTINGS);

  const handleSoundToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    setSettings((prev: GameSettings): GameSettings => ({
      ...prev,
      soundEnabled: enabled
    }));
    soundService.toggleSound(enabled);
  };

  const handleHapticToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    setSettings((prev: GameSettings): GameSettings => ({
      ...prev,
      hapticEnabled: enabled
    }));
    soundService.toggleHaptic(enabled);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setSettings((prev: GameSettings): GameSettings => ({
      ...prev,
      volume: newVolume
    }));
    soundService.setVolume(newVolume);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-5 right-5 bg-black/80 backdrop-blur-sm rounded-xl p-4 text-white z-50"
    >
      <h3 className="text-lg font-bold mb-4">Settings</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-8">
          <span className="text-sm">Sound Effects</span>
          <ToggleSwitch
            checked={settings.soundEnabled}
            onChange={handleSoundToggle}
          />
        </div>

        <div className="flex items-center justify-between gap-8">
          <span className="text-sm">Volume</span>
          <VolumeSlider
            value={settings.volume}
            onChange={handleVolumeChange}
            disabled={!settings.soundEnabled}
          />
        </div>

        <div className="flex items-center justify-between gap-8">
          <span className="text-sm">Haptic Feedback</span>
          <ToggleSwitch
            checked={settings.hapticEnabled}
            onChange={handleHapticToggle}
          />
        </div>
      </div>
    </motion.div>
  );
}; 