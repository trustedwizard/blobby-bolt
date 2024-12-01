import * as PIXI from 'pixi.js';

interface PlayerProps {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: number;
  name: string;
}

export class Player {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: number;
  name: string;
  graphics: PIXI.Graphics;

  constructor(props: PlayerProps) {
    this.id = props.id;
    this.x = props.x;
    this.y = props.y;
    this.radius = props.radius;
    this.color = props.color;
    this.name = props.name;
    
    // Create PIXI graphics
    this.graphics = new PIXI.Graphics();
    this.updateGraphics();
  }

  updateGraphics() {
    this.graphics.clear();
    this.graphics.beginFill(this.color);
    this.graphics.drawCircle(0, 0, this.radius);
    this.graphics.endFill();
    this.graphics.position.set(this.x, this.y);
  }
} 