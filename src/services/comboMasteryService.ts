interface MasteryReward {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockRequirement: number;
  comboType: string;
}

const MASTERY_REWARDS: MasteryReward[] = [
  {
    id: 'speed-shield-bronze',
    name: 'Shield Runner',
    description: 'Activate Speed Shield combo 10 times',
    icon: '🛡️',
    unlockRequirement: 10,
    comboType: 'SPEED_SHIELD'
  },
  {
    id: 'magnet-gravity-bronze',
    name: 'Gravity Well',
    description: 'Activate Magnet Gravity combo 10 times',
    icon: '🌌',
    unlockRequirement: 10,
    comboType: 'MAGNET_GRAVITY'
  },
  {
    id: 'teleport-split-bronze',
    name: 'Quantum Splitter',
    description: 'Activate Teleport Split combo 10 times',
    icon: '⚛️',
    unlockRequirement: 10,
    comboType: 'TELEPORT_SPLIT'
  },
  // Silver tier
  {
    id: 'speed-shield-silver',
    name: 'Shield Master',
    description: 'Activate Speed Shield combo 25 times',
    icon: '🛡️⚔️',
    unlockRequirement: 25,
    comboType: 'SPEED_SHIELD'
  }
];

class ComboMasteryService {
  private unlockedRewards: Set<string>;

  constructor() {
    this.unlockedRewards = new Set(
      JSON.parse(localStorage.getItem('unlockedRewards') || '[]')
    );
  }

  checkMasteryProgress(comboType: string, activations: number) {
    const eligibleRewards = MASTERY_REWARDS.filter(
      reward => reward.comboType === comboType && 
                reward.unlockRequirement <= activations &&
                !this.unlockedRewards.has(reward.id)
    );

    eligibleRewards.forEach(reward => {
      this.unlockReward(reward);
    });
  }

  private unlockReward(reward: MasteryReward) {
    this.unlockedRewards.add(reward.id);
    localStorage.setItem('unlockedRewards', 
      JSON.stringify(Array.from(this.unlockedRewards))
    );

    // Dispatch event for UI notification
    const event = new CustomEvent('mastery-reward-unlocked', {
      detail: reward
    });
    window.dispatchEvent(event);
  }

  getUnlockedRewards(): MasteryReward[] {
    return MASTERY_REWARDS.filter(reward => 
      this.unlockedRewards.has(reward.id)
    );
  }

  hasReward(rewardId: string): boolean {
    return this.unlockedRewards.has(rewardId);
  }
}

export const comboMasteryService = new ComboMasteryService(); 