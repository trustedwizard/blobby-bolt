export interface ComboAchievement {
  id: string;
  name: string;
  description: string;
  comboType: string;
  requirement: number;
  reward?: string;
  progress: number;
  completed: boolean;
}

export const COMBO_ACHIEVEMENTS: ComboAchievement[] = [
  {
    id: 'speed-shield-master',
    name: 'Shield Sprinter',
    description: 'Activate the Speed Shield combo 10 times',
    comboType: 'SPEED_SHIELD',
    requirement: 10,
    reward: '🏃‍♂️ Speed Runner Title',
    progress: 0,
    completed: false
  },
  {
    id: 'gravity-master',
    name: 'Black Hole Master',
    description: 'Pull 50 blobs with Magnet Gravity combo',
    comboType: 'MAGNET_GRAVITY',
    requirement: 50,
    reward: '🌌 Gravity Master Title',
    progress: 0,
    completed: false
  },
  {
    id: 'quantum-splitter',
    name: 'Quantum Splitter',
    description: 'Split 25 blobs with Teleport Split combo',
    comboType: 'TELEPORT_SPLIT',
    requirement: 25,
    reward: '⚛️ Quantum Title',
    progress: 0,
    completed: false
  }
]; 