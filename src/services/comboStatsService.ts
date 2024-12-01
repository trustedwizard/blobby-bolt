import { PowerUpCombo } from '../types/powerups';
import { ComboAchievement, COMBO_ACHIEVEMENTS } from '../types/achievements';

interface ComboStats {
  totalActivations: number;
  successfulHits: number;
  longestDuration: number;
  achievements: ComboAchievement[];
}

class ComboStatsService {
  private stats: Map<string, ComboStats> = new Map();
  private achievements: ComboAchievement[] = [...COMBO_ACHIEVEMENTS];

  constructor() {
    this.loadStats();
  }

  private loadStats() {
    const savedStats = localStorage.getItem('comboStats');
    if (savedStats) {
      const parsed = JSON.parse(savedStats);
      Object.entries(parsed).forEach(([key, value]) => {
        this.stats.set(key, value as ComboStats);
      });
    }
  }

  private saveStats() {
    const statsObj = Object.fromEntries(this.stats.entries());
    localStorage.setItem('comboStats', JSON.stringify(statsObj));
  }

  trackComboActivation(combo: PowerUpCombo) {
    const comboType = combo.types.join('_');
    const stats = this.getComboStats(comboType);
    
    stats.totalActivations++;
    this.updateAchievements(comboType, 'activation');
    this.saveStats();
  }

  trackComboSuccess(comboType: string) {
    const stats = this.getComboStats(comboType);
    stats.successfulHits++;
    this.updateAchievements(comboType, 'success');
    this.saveStats();
  }

  private getComboStats(comboType: string): ComboStats {
    if (!this.stats.has(comboType)) {
      this.stats.set(comboType, {
        totalActivations: 0,
        successfulHits: 0,
        longestDuration: 0,
        achievements: this.achievements.filter(a => a.comboType === comboType)
      });
    }
    return this.stats.get(comboType)!;
  }

  private updateAchievements(comboType: string, type: 'activation' | 'success') {
    const stats = this.getComboStats(comboType);
    stats.achievements.forEach(achievement => {
      if (!achievement.completed) {
        if (type === 'activation') {
          achievement.progress++;
        }
        if (achievement.progress >= achievement.requirement) {
          achievement.completed = true;
          this.onAchievementComplete(achievement);
        }
      }
    });
  }

  private onAchievementComplete(achievement: ComboAchievement) {
    try {
      const event = new CustomEvent('achievement-unlocked', {
        detail: achievement
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Error dispatching achievement event:', error);
    }
  }

  getAchievements(): ComboAchievement[] {
    return this.achievements;
  }

  getStats(comboType: string): ComboStats | undefined {
    return this.stats.get(comboType);
  }
}

export const comboStatsService = new ComboStatsService(); 