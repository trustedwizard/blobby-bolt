import React, { useEffect, useRef, useState, memo, useCallback } from 'react';
import { Application } from 'pixi.js';
import { useGameStore } from '../store/gameStore';
import { PowerUpVisualEffect, CollisionEffect } from '../types/effects';
import { CONFIG } from '../constants/gameConfig';
import { POWER_UP_PROPERTIES } from '../types/powerups';
import { VisualEffectsSystem } from '../systems/VisualEffectsSystem';
import { GameLoop } from '../systems/GameLoop';
import { useMediaQuery } from '../hooks/useMediaQuery';
import TouchControls from './TouchControls';
import { GameHUD } from './GameHUD';
import { ErrorBoundary } from './ErrorBoundary';

export const Game = memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application>();
  const visualEffects = useRef<VisualEffectsSystem>();
  const gameLoop = useRef<GameLoop>();
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const socket = useGameStore(state => state.socket);

  // Effect handlers
  const createEffect = useCallback((effect: PowerUpVisualEffect | CollisionEffect, type: 'powerUp' | 'collision') => {
    if (!visualEffects.current) {
      console.warn(`Cannot create ${type} effect: Visual effects system not initialized`);
      return;
    }

    try {
      switch (type) {
        case 'powerUp':
          const powerUpEffect = effect as PowerUpVisualEffect;
          visualEffects.current.createPowerUpEffect(
            { x: powerUpEffect.position.x, y: powerUpEffect.position.y },
            POWER_UP_PROPERTIES[powerUpEffect.powerUpType].color
          );
          break;
        case 'collision':
          const collisionEffect = effect as CollisionEffect;
          visualEffects.current.createCollisionEffect(
            { x: collisionEffect.position.x, y: collisionEffect.position.y },
            CONFIG.effects.colors[collisionEffect.type]
          );
          break;
      }
    } catch (error) {
      console.error(`Error creating ${type} effect:`, error);
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('effect', (effect: PowerUpVisualEffect | CollisionEffect) => {
      createEffect(effect, 'powerup_collect' in effect ? 'powerUp' : 'collision');
    });

    return () => {
      socket.off('effect');
    };
  }, [socket, createEffect]);

  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      // Initialize PIXI Application
      const app = new Application({
        view: canvasRef.current,
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x1a1a1a,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      appRef.current = app;

      // Initialize game systems
      visualEffects.current = VisualEffectsSystem.getInstance();
      visualEffects.current.init(app, CONFIG.effects);
      gameLoop.current = new GameLoop();
      gameLoop.current.init(app);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to initialize game:', error);
      setIsLoading(false);
    }

    // Handle window resize
    const handleResize = () => {
      if (appRef.current) {
        appRef.current.renderer.resize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      appRef.current?.destroy(true);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="game-container relative">
        <canvas 
          ref={canvasRef}
          className="absolute inset-0"
          aria-label="Game canvas"
        />
        <GameHUD isMobile={isMobile} />
        {isMobile && <TouchControls />}
      </div>
    </ErrorBoundary>
  );
});

Game.displayName = 'Game';

export default Game;