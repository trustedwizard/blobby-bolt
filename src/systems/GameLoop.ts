import { Application } from 'pixi.js';
import { useGameStore } from '../store/gameStore';
import { CONFIG } from '../constants/gameConfig';
import { Blob } from '../types/common';

export class GameLoop {
  private app: Application | null = null;
  private lastTime: number = 0;
  private accumulator: number = 0;
  private readonly timestep: number = 1000 / CONFIG.game.tickRate;

  init(app: Application): void {
    this.app = app;
    this.lastTime = performance.now();
    this.setupGameLoop();
  }

  private setupGameLoop(): void {
    if (!this.app) return;

    this.app.ticker.add(() => {
      const currentTime = performance.now();
      const deltaTime = currentTime - this.lastTime;
      this.lastTime = currentTime;

      this.accumulator += deltaTime;

      while (this.accumulator >= this.timestep) {
        this.update(this.timestep);
        this.accumulator -= this.timestep;
      }

      this.render();
    });
  }

  private update(deltaTime: number): void {
    const state = useGameStore.getState();
    const { player, socket } = state;

    if (player && socket?.connected) {
      // Update player position based on input
      const mousePosition = state.mousePosition;
      const viewport = state.viewport;

      // Calculate direction vector
      const dx = mousePosition.x - viewport.x;
      const dy = mousePosition.y - viewport.y;
      const length = Math.sqrt(dx * dx + dy * dy);

      if (length > 0) {
        const normalizedDx = dx / length;
        const normalizedDy = dy / length;

        // Calculate player speed based on mass
        const baseSpeed = CONFIG.physics.baseSpeed;
        const massRatio = Math.max(0, 1 - (player.mass * CONFIG.physics.massToSpeedRatio));
        const speed = Math.max(
          CONFIG.physics.minSpeed,
          Math.min(CONFIG.physics.maxSpeed, baseSpeed * massRatio)
        );

        // Update player velocity
        player.velocity = {
          x: normalizedDx * speed,
          y: normalizedDy * speed
        };

        // Apply power-up effects
        if (player.activePowerUps) {
          player.activePowerUps.forEach(powerUp => {
            if (powerUp.type === 'SPEED' && Date.now() < powerUp.startTime + powerUp.duration) {
              player.velocity.x *= CONFIG.powerUps.effectDurations.SPEED;
              player.velocity.y *= CONFIG.powerUps.effectDurations.SPEED;
            }
          });
        }

        // Check world boundaries
        const nextX = player.x + player.velocity.x;
        const nextY = player.y + player.velocity.y;
        const radius = player.radius;

        if (nextX - radius < 0 || nextX + radius > CONFIG.game.worldSize) {
          player.velocity.x = 0;
        }
        if (nextY - radius < 0 || nextY + radius > CONFIG.game.worldSize) {
          player.velocity.y = 0;
        }

        // Update position
        player.x += player.velocity.x;
        player.y += player.velocity.y;

        // Update trail
        if (player.trail) {
          player.trail.push({ x: player.x, y: player.y });
          if (player.trail.length > 10) { // Keep last 10 positions
            player.trail.shift();
          }
        }

        // Emit position update
        socket.emit('player:move', {
          x: player.x,
          y: player.y,
          velocity: player.velocity,
          timestamp: Date.now()
        });
      }

      // Update camera/viewport
      this.updateViewport(state, player);
    }
  }

  private updateViewport(state: any, player: Blob): void {
    const targetZoom = Math.max(0.5, Math.min(1, 30 / player.radius));
    const currentZoom = state.zoom;
    
    // Smooth zoom interpolation
    const newZoom = currentZoom + (targetZoom - currentZoom) * 0.1;
    
    // Update viewport position with smooth follow
    const targetX = player.x - (window.innerWidth / 2) / newZoom;
    const targetY = player.y - (window.innerHeight / 2) / newZoom;
    
    useGameStore.setState({
      viewport: {
        x: targetX,
        y: targetY,
        scale: newZoom
      },
      zoom: newZoom
    });
  }

  private render(): void {
    // Add any custom rendering logic here
    // The PIXI application will handle most rendering automatically
  }

  destroy(): void {
    if (this.app) {
      this.app.ticker.remove(this.setupGameLoop);
      this.app = null;
    }
  }
} 