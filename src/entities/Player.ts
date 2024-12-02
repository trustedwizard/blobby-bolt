import * as PIXI from 'pixi.js';
import { Blob, Position, Velocity } from '../types/common';
import { CONFIG } from '../constants/gameConfig';

interface PlayerProps {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: number;
  name: string;
  mass?: number;
  teamId?: string;
  emoji?: string;
}

export class Player implements Blob {
  // Required Blob properties
  public readonly id: string;
  public readonly type: 'player' = 'player';
  public x: number;
  public y: number;
  public radius: number;
  public color: number;
  public name: string;
  public mass: number;
  public score: number = 0;
  public trail: Position[] = [];
  public velocity: Velocity = { x: 0, y: 0 };
  public lastRadius: number;
  public readonly spawnTime: number;
  public lastUpdateTime: number;
  
  // Optional Blob properties
  public teamId?: string;
  public emoji?: string;
  public isGhost?: boolean;
  public shield?: boolean;
  public lastCollisionTime?: number;
  public lastSplitTime?: number;
  public lastEjectTime?: number;
  public lastMergeTime?: number;
  public canMerge?: boolean;
  
  // PIXI specific
  private graphics: PIXI.Graphics;
  private nameText?: PIXI.Text;

  constructor(props: PlayerProps) {
    this.id = props.id;
    this.x = props.x;
    this.y = props.y;
    this.radius = props.radius;
    this.color = props.color;
    this.name = props.name;
    this.mass = props.mass || CONFIG.physics.startingMass;
    this.teamId = props.teamId;
    this.emoji = props.emoji;
    
    this.lastRadius = this.radius;
    this.spawnTime = Date.now();
    this.lastUpdateTime = Date.now();
    
    // Create PIXI graphics
    this.graphics = new PIXI.Graphics();
    this.updateGraphics();
  }

  private updateGraphics() {
    this.graphics.clear();
    
    // Draw shield if active
    if (this.shield) {
      this.graphics.lineStyle(2, 0x00ffff, 0.5);
      this.graphics.drawCircle(0, 0, this.radius + 5);
    }
    
    // Draw main blob
    this.graphics.beginFill(this.color, this.isGhost ? 0.5 : 1);
    this.graphics.drawCircle(0, 0, this.radius);
    this.graphics.endFill();
    
    // Update position
    this.graphics.position.set(this.x, this.y);
    
    // Add name text if not already present
    if (!this.nameText) {
      this.nameText = new PIXI.Text(this.name, {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: 0xffffff,
        align: 'center'
      });
      this.nameText.anchor.set(0.5);
      this.nameText.y = -this.radius - 20;
      this.graphics.addChild(this.nameText);
    }
  }

  public split(): boolean {
    if (this.mass < CONFIG.game.minSplitSize * 2) return false;
    if (this.lastSplitTime && Date.now() - this.lastSplitTime < CONFIG.physics.splitCooldown) return false;
    
    this.lastSplitTime = Date.now();
    return true;
  }

  public eject(): boolean {
    if (this.lastEjectTime && Date.now() - this.lastEjectTime < CONFIG.physics.ejectionCooldown) return false;
    
    this.lastEjectTime = Date.now();
    return true;
  }

  public canMergeWith(other: Player): boolean {
    if (!this.lastSplitTime || !other.lastSplitTime) return false;
    const mergeCooldownPassed = Date.now() - Math.max(this.lastSplitTime, other.lastSplitTime) >= CONFIG.physics.mergeCooldown;
    return mergeCooldownPassed && this.teamId === other.teamId;
  }

  public update(delta: number): void {
    // Update position based on velocity
    this.x += this.velocity.x * delta;
    this.y += this.velocity.y * delta;
    
    // Apply friction
    this.velocity.x *= (1 - CONFIG.game.friction);
    this.velocity.y *= (1 - CONFIG.game.friction);
    
    // Update trail
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 10) this.trail.shift();
    
    this.lastUpdateTime = Date.now();
    this.updateGraphics();
  }

  public getGraphics(): PIXI.Graphics {
    return this.graphics;
  }

  public destroy(): void {
    if (this.nameText) {
      this.nameText.destroy();
      this.nameText = undefined;
    }
    this.graphics.destroy();
    this.trail = [];
  }
} 