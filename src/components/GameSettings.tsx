import React from 'react';
import styled from 'styled-components';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { soundService } from '../services/soundService';

const SettingsPanel = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 8px;
  padding: 15px;
  color: white;
  z-index: 1000;
`;

const SettingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 10px 0;
  gap: 20px;
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: .4s;
    border-radius: 34px;

    &:before {
      position: absolute;
      content: "";
      height: 26px;
      width: 26px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }
  }

  input:checked + span {
    background-color: #2196F3;
  }

  input:checked + span:before {
    transform: translateX(26px);
  }
`;

const VolumeSlider = styled.input`
  width: 100px;
  height: 4px;
  border-radius: 2px;
  background: #ccc;
  outline: none;
  opacity: 0.7;
  transition: opacity .2s;

  &:hover {
    opacity: 1;
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #2196F3;
    cursor: pointer;
  }

  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #2196F3;
    cursor: pointer;
  }
`;

interface GameSettingsProps {}

export const GameSettings: React.FC<GameSettingsProps> = () => {
  const [soundEnabled, setSoundEnabled] = useLocalStorage<boolean>('soundEnabled', true);
  const [hapticEnabled, setHapticEnabled] = useLocalStorage<boolean>('hapticEnabled', true);
  const [volume, setVolume] = useLocalStorage<number>('volume', 0.5);

  const handleSoundToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    setSoundEnabled(enabled);
    soundService.toggleSound(enabled);
  };

  const handleHapticToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    setHapticEnabled(enabled);
    soundService.toggleHaptic(enabled);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    soundService.setVolume(newVolume);
  };

  return (
    <SettingsPanel>
      <h3>Settings</h3>
      <SettingRow>
        <span>Sound Effects</span>
        <ToggleSwitch>
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={handleSoundToggle}
          />
          <span />
        </ToggleSwitch>
      </SettingRow>
      <SettingRow>
        <span>Volume</span>
        <VolumeSlider
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={handleVolumeChange}
          disabled={!soundEnabled}
        />
      </SettingRow>
      <SettingRow>
        <span>Haptic Feedback</span>
        <ToggleSwitch>
          <input
            type="checkbox"
            checked={hapticEnabled}
            onChange={handleHapticToggle}
          />
          <span />
        </ToggleSwitch>
      </SettingRow>
    </SettingsPanel>
  );
}; 