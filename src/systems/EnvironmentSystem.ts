import { Position } from '../types/common';
import { BaseSystem } from './BaseSystem';

interface Zone {
  id: string;
  type: 'speed' | 'slow' | 'danger';
  x: number;
  y: number;
  radius: number;
  effect: number;
}

interface ZoneEffects {
  speedMultiplier: number;
}

export class EnvironmentSystem extends BaseSystem {
  private zones: Map<string, Zone> = new Map();
  
  private constructor() {
    super();
    this.generateZones();
  }

  public static getInstance(): EnvironmentSystem {
    if (!EnvironmentSystem.instance) {
      EnvironmentSystem.instance = new EnvironmentSystem();
    }
    return EnvironmentSystem.instance;
  }

  private generateZones(): void {
    // Generate different types of zones
    const zoneConfigs = [
      { type: 'speed', effect: 1.5, count: 3 },
      { type: 'slow', effect: 0.7, count: 2 },
      { type: 'danger', effect: 0.5, count: 2 }
    ];

    zoneConfigs.forEach(config => {
      for (let i = 0; i < config.count; i++) {
        const zone: Zone = {
          id: `${config.type}-${i}`,
          type: config.type as 'speed' | 'slow' | 'danger',
          x: Math.random() * 4000,
          y: Math.random() * 4000,
          radius: 200 + Math.random() * 100,
          effect: config.effect
        };
        this.zones.set(zone.id, zone);
      }
    });
  }

  private getZoneTypeAtPosition(position: Position): 'speed' | 'slow' | 'danger' | null {
    for (const zone of this.zones.values()) {
      const distance = Math.hypot(zone.x - position.x, zone.y - position.y);
      if (distance <= zone.radius) {
        return zone.type;
      }
    }
    return null;
  }

  public getZoneEffects(position: Position): ZoneEffects {
    // Add zone type checking
    const zoneType = this.getZoneTypeAtPosition(position);
    
    switch(zoneType) {
      case 'speed':
        return { speedMultiplier: 1.5 };
      case 'slow':
        return { speedMultiplier: 0.7 };
      default:
        return { speedMultiplier: 1.0 };
    }
  }

  public getZones(): Zone[] {
    return Array.from(this.zones.values());
  }

  protected cleanupResources(): void {
    this.zones.clear();
  }
} 