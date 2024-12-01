import { useGameStore } from '../store/gameStore';
import { socketService } from '../services/socket';
import { Blob, Food } from '../types/game';

interface Collision {
  type: 'blob' | 'food';
  source: string;
  target: string;
  position: { x: number; y: number };
}

export class GameLoop {
  private lastUpdate: number = 0;
  private running: boolean = false;

  constructor() {
    this.lastUpdate = Date.now();
  }

  start() {
    this.running = true;
    this.update();
  }

  stop() {
    this.running = false;
  }

  private update = () => {
    if (!this.running) return;

    const now = Date.now();
    const delta = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;

    const state = useGameStore.getState();
    
    // Update game state
    this.updateGameState(delta);

    // Request next frame
    requestAnimationFrame(this.update);
  }

  private updateGameState(delta: number) {
    const state = useGameStore.getState();
    
    // Update camera
    state.updateCamera();
    
    // Update player positions with delta time
    if (state.player && state.mousePosition) {
      state.updatePlayerPosition(
        state.mousePosition.x,
        state.mousePosition.y,
        delta
      );
    }
    
    // Update split blobs with delta time
    state.updateSplitBlobs(delta);
    
    // Check collisions
    this.checkCollisions(state.blobs, state.food);

    // Update power-ups
    this.updatePowerUps();
  }

  private updatePowerUps() {
    const state = useGameStore.getState();
    const now = Date.now();

    // Clean up expired power-ups and combos
    useGameStore.setState(state => ({
      activePowerUps: state.activePowerUps.filter(powerUp => 
        powerUp.expiresAt > now
      ),
      activeCombos: state.activeCombos.filter(combo => 
        combo.startTime + combo.duration > now
      )
    }));

    // Check power-up collisions
    if (state.player) {
      state.powerUps.forEach(powerUp => {
        const distance = Math.hypot(
          powerUp.position.x - state.player!.x,
          powerUp.position.y - state.player!.y
        );
        
        if (distance < state.player!.radius) {
          state.collectPowerUp(powerUp.id);
        }
      });
    }
  }

  private checkCollisions(blobs: Blob[], food: Map<string, Food>) {
    const state = useGameStore.getState();
    if (!state.player) return;

    const collisions: Collision[] = [];

    // Check food collisions
    food.forEach((foodItem, foodId) => {
      const distance = Math.hypot(
        foodItem.x - state.player!.x,
        foodItem.y - state.player!.y
      );
      
      if (distance < state.player!.radius + foodItem.size) {
        collisions.push({
          type: 'food',
          source: state.player!.id,
          target: foodId,
          position: { x: foodItem.x, y: foodItem.y }
        });
      }
    });

    // Check blob collisions
    blobs.forEach(blob => {
      if (blob.id === state.player!.id) return;

      const distance = Math.hypot(
        blob.x - state.player!.x,
        blob.y - state.player!.y
      );

      if (distance < Math.max(state.player!.radius, blob.radius)) {
        collisions.push({
          type: 'blob',
          source: state.player!.id,
          target: blob.id,
          position: { x: blob.x, y: blob.y }
        });
      }
    });

    // Emit collisions to server
    if (collisions.length > 0) {
      socketService.emit('collision:detect', collisions);
    }
  }

  public dispose() {
    this.stop();
  }
} 