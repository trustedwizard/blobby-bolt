import { PowerUp, PowerUpType } from '../types/powerups';
import { Position } from '../types/common';
import { AIBlob } from '../types/gameObjects';
import { BaseSystem } from '../systems/BaseSystem';
import { socketService } from '../services/socket';
import { useGameStore } from '../store/gameStore';

interface AIBehavior {
  powerUpPrioritization: (powerUps: PowerUp[], aiBlob: AIBlob) => PowerUp[];
  threatAssessment: (players: AIBlob[], aiBlob: AIBlob) => AIBlob[];
  territoryControl: (position: Position, aiBlob: AIBlob, players: AIBlob[]) => boolean;
  teamCoordination: (teammates: AIBlob[], aiBlob: AIBlob) => void;
}

export class AIStrategySystem extends BaseSystem implements AIBehavior {
  protected static instance: AIStrategySystem | null = null;

  protected constructor() {
    super();
  }

  public static getInstance(): AIStrategySystem {
    if (!AIStrategySystem.instance) {
      AIStrategySystem.instance = new AIStrategySystem();
    }
    return AIStrategySystem.instance;
  }

  public powerUpPrioritization(powerUps: PowerUp[], aiBlob: AIBlob): PowerUp[] {
    return powerUps.sort((a, b) => {
      const scoreA = this.calculatePowerUpScore(a, aiBlob);
      const scoreB = this.calculatePowerUpScore(b, aiBlob);
      return scoreB - scoreA;
    });
  }

  private calculatePowerUpScore(powerUp: PowerUp, aiBlob: AIBlob): number {
    let score = 0;

    switch (powerUp.type) {
      case PowerUpType.SHIELD:
        // Higher priority when small or under threat
        score = aiBlob.radius < 50 ? 100 : 50;
        break;
      case PowerUpType.SPEED_BOOST:
        // Higher priority when chasing or escaping
        score = 80;
        break;
      case PowerUpType.BLOB_MAGNET:
        // Higher priority when many small blobs nearby
        score = aiBlob.radius > 100 ? 90 : 40;
        break;
      case PowerUpType.GRAVITY_PULSE:
        // Higher priority when surrounded
        score = 70;
        break;
      case PowerUpType.TELEPORT:
        // Higher priority when in danger
        score = 60;
        break;
      case PowerUpType.SPLIT_BOMB:
        // Higher priority when large enough to split
        score = aiBlob.radius > 100 ? 85 : 30;
        break;
    }

    // Adjust score based on distance
    const distance = Math.hypot(
      powerUp.position.x - aiBlob.x,
      powerUp.position.y - aiBlob.y
    );
    score *= 1 / (1 + distance * 0.001); // Distance penalty

    return score;
  }

  public threatAssessment(players: AIBlob[], aiBlob: AIBlob): AIBlob[] {
    return players
      .filter(player => player.id !== aiBlob.id)
      .map(player => ({
        ...player,
        threatLevel: this.calculateThreatLevel(player, aiBlob)
      }))
      .sort((a: any, b: any) => b.threatLevel - a.threatLevel);
  }

  private calculateThreatLevel(player: AIBlob, aiBlob: AIBlob): number {
    const distance = Math.hypot(player.x - aiBlob.x, player.y - aiBlob.y);
    const sizeDifference = player.radius - aiBlob.radius;
    const isSplitCapable = player.radius > 50;

    let threatLevel = 0;
    
    // Size-based threat
    threatLevel += sizeDifference > 0 ? sizeDifference * 2 : 0;
    
    // Distance-based threat
    threatLevel += (1000 - Math.min(distance, 1000)) * 0.1;
    
    // Split capability threat
    if (isSplitCapable && distance < 500) {
      threatLevel += 200;
    }

    return threatLevel;
  }

  public territoryControl(position: Position, aiBlob: AIBlob, players: AIBlob[]): boolean {
    const TERRITORY_RADIUS = aiBlob.radius * 3;
    const nearbyPlayers = players.filter(player => {
      const distance = Math.hypot(player.x - position.x, player.y - position.y);
      return distance < TERRITORY_RADIUS;
    });

    // Calculate total mass in territory
    const territoryMass = nearbyPlayers.reduce((total, player) => {
      return total + Math.PI * player.radius * player.radius;
    }, 0);

    // Calculate AI blob's influence
    const aiMass = Math.PI * aiBlob.radius * aiBlob.radius;

    // Territory is controlled if AI has significant mass presence
    return aiMass > territoryMass * 0.4;
  }

  public teamCoordination(teammates: AIBlob[], aiBlob: AIBlob): void {
    const FORMATION_DISTANCE = 200;
    const teamCenter = this.calculateTeamCenter(teammates);
    
    // Determine formation position based on role
    const formationPosition = this.calculateFormationPosition(
      aiBlob,
      teammates,
      teamCenter,
      FORMATION_DISTANCE
    );

    // Update AI movement target
    this.updateAIMovementTarget(aiBlob, formationPosition);
  }

  private calculateTeamCenter(teammates: AIBlob[]): Position {
    const totalX = teammates.reduce((sum, t) => sum + t.x, 0);
    const totalY = teammates.reduce((sum, t) => sum + t.y, 0);
    return {
      x: totalX / teammates.length,
      y: totalY / teammates.length
    };
  }

  private calculateFormationPosition(
    aiBlob: AIBlob,
    teammates: AIBlob[],
    center: Position,
    distance: number
  ): Position {
    // Assign positions in circular formation
    const angle = (teammates.indexOf(aiBlob) / teammates.length) * Math.PI * 2;
    return {
      x: center.x + Math.cos(angle) * distance,
      y: center.y + Math.sin(angle) * distance
    };
  }

  private updateAIMovementTarget(aiBlob: AIBlob, target: Position): void {
    // Update store with new position
    useGameStore.getState().updateBlobPosition(aiBlob.id, target.x, target.y);
    
    // Emit to server
    socketService.emit('ai:move', {
      blobId: aiBlob.id,
      target,
      timestamp: Date.now()
    });
  }

  protected cleanupResources(): void {
    // Clean up any AI-specific resources
    this.updateAIMovementTarget = () => {};  // Clear movement handler
  }
}

export const aiStrategySystem = AIStrategySystem.getInstance(); 