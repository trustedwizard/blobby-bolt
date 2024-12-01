import React, { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import * as PIXI from 'pixi.js';
import { Stage, Container } from '@pixi/react';
import { useGameStore } from '../store/gameStore';
import { Blob } from './Blob';
import { Notifications } from './Notifications';
import { GameHUD } from './GameHUD';
import { Grid } from './Grid';
import { Food } from './Food';
import { useKeyboardControls } from '../hooks/useKeyboardControls';
import { Position } from '../types/common';
import { BlobErrorBoundary } from './BlobErrorBoundary';
import { gameSystems } from '../systems/GameSystems';
import { PerformanceManager } from '../systems/PerformanceManager';
import { TutorialSystem } from './Tutorial/TutorialSystem';
import { ObstacleSystem } from '../systems/ObstacleSystem';
import { TrailSystem } from '../systems/TrailSystem';
import { EnvironmentSystem } from '../systems/EnvironmentSystem';
import { VisualEffectsSystem } from '../systems/VisualEffectsSystem';
import { WORLD_SIZE } from '../constants/gameConstants';
import { PowerUpEffect, CollisionEffect, GrowthEffect } from '../types/effects';
import { IVisualEffectsSystem } from '../systems/VisualEffectsSystem';
import { GameLoop } from '../systems/GameLoop';
import { useMediaQuery } from '../hooks/useMediaQuery';

// Configure PIXI.js defaults
PIXI.settings.PREFER_ENV = PIXI.ENV.WEBGL2;
PIXI.settings.RESOLUTION = window.devicePixelRatio || 1;

interface RenderOptions extends PIXI.IRendererOptions {
  powerPreference: 'high-performance';
  clearBeforeRender: boolean;
  forceCanvas: boolean;
  autoDensity: boolean;
  autoStart: boolean;
  preserveDrawingBuffer: boolean;
  premultipliedAlpha: boolean;
  hello: boolean;
  context: null;
  backgroundAlpha: number;
  preferWebGLVersion: number;
}

// Define the GameSystem type that uses BaseSystem
type GameSystem = PerformanceManager | IVisualEffectsSystem | ObstacleSystem | TrailSystem | EnvironmentSystem;

// Update the type guard to properly check for BaseSystem
const isGameSystem = (system: any): system is GameSystem => {
  return system !== null && (
    system instanceof PerformanceManager ||
    system instanceof VisualEffectsSystem ||
    system instanceof ObstacleSystem ||
    system instanceof TrailSystem ||
    system instanceof EnvironmentSystem
  );
};

export function Game() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isLoading, setIsLoading] = useState(true);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const {
    blobs,
    notifications,
    viewport,
    setViewport,
    worldToScreen,
    splitBlob,
    ejectMass,
    player,
    food,
    socket,
    setMousePosition,
    setZoom
  } = useGameStore();
  const [app, setApp] = useState<PIXI.Application<PIXI.ICanvas> | null>(null);
  const containerRef = useRef<PIXI.Container | null>(null);
  const [performanceManager, setPerformanceManager] = useState<PerformanceManager | null>(null);
  const visualEffects = useRef<IVisualEffectsSystem | null>(null);
  const obstacleSystem = useRef<ObstacleSystem | null>(null);
  const trailSystem = useRef<TrailSystem | null>(null);
  const environmentSystem = useRef<EnvironmentSystem | null>(null);
  const [gameLoop] = useState(() => new GameLoop());
  const TouchControls = React.lazy(() => import('./TouchControls'));

  const detectBestRenderer = useCallback(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2', {
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: true
      }) || canvas.getContext('webgl', {
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: true
      });

      if (gl instanceof WebGL2RenderingContext) {
        return 'webgl2';
      } else if (gl instanceof WebGLRenderingContext) {
        return 'webgl';
      }
      return 'canvas';
    } catch (e) {
      console.warn('WebGL detection failed:', e);
      return 'canvas';
    }
  }, []);

  const handleResize = useCallback(() => {
    const newDimensions = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    setDimensions(newDimensions);
    setViewport({
      ...viewport,
      width: newDimensions.width,
      height: newDimensions.height,
    });

    if (app?.renderer) {
      app.renderer.resize(newDimensions.width, newDimensions.height);
    }
  }, [app, viewport, setViewport]);

  useEffect(() => {
    const initGame = async () => {
      try {
        detectBestRenderer();
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing game:', error);
        setIsLoading(false);
      }
    };

    initGame();
  }, [detectBestRenderer]);

  useEffect(() => {
    if (!app || !socket) return;

    // Center the camera initially
    if (containerRef.current) {
      containerRef.current.position.set(window.innerWidth / 2, window.innerHeight / 2);
    }

    // Initialize player position at the center of the world
    if (player) {
      // Create a type-safe update to the player
      const updatedPlayer = {
        ...player,
        x: WORLD_SIZE / 2,
        y: WORLD_SIZE / 2,
        lastRadius: player.radius // Initialize lastRadius
      } as const;

      // Update the player in the store
      useGameStore.setState(state => ({
        ...state,
        player: updatedPlayer,
        blobs: state.blobs.map(b => 
          b.id === player.id ? updatedPlayer : b
        )
      }));
    }

  }, [app, socket, player]);

  useEffect(() => {
    gameLoop.start();
    return () => gameLoop.stop();
  }, [gameLoop]);

  const handlePointerMove = useCallback((event: PIXI.FederatedPointerEvent) => {
    if (!player) return;
    setMousePosition({ x: event.global.x, y: event.global.y });
  }, [player, setMousePosition]);

  const handleMount = useCallback((pixiApp: PIXI.Application<PIXI.ICanvas>) => {
    if (!pixiApp) return;
    
    setApp(pixiApp);
    useGameStore.getState().setPixiApp(pixiApp);

    if (pixiApp.renderer instanceof PIXI.Renderer) {
      const performanceManager = PerformanceManager.getInstance(pixiApp.renderer);
      setPerformanceManager(performanceManager);
      
      // Initialize all systems
      visualEffects.current = VisualEffectsSystem.getInstance(pixiApp.stage);
      obstacleSystem.current = ObstacleSystem.getInstance();
      trailSystem.current = TrailSystem.getInstance();
      environmentSystem.current = EnvironmentSystem.getInstance();
      
      // Store systems for cleanup
      const activeSystems = [
        performanceManager,
        visualEffects.current,
        obstacleSystem.current,
        trailSystem.current,
        environmentSystem.current,
        gameLoop
      ].filter(isGameSystem);
      
      pixiApp.stage.eventMode = 'static';
      pixiApp.stage.hitArea = pixiApp.screen;
      pixiApp.renderer.background.color = 0x000000;

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        pixiApp.destroy(true, { children: true, texture: true, baseTexture: true });
        
        // Clean up all systems including GameLoop
        activeSystems.forEach(system => {
          system.dispose();
        });
      };
    }
  }, [handleResize, gameLoop]);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    switch (event.code) {
      case 'Space':
        event.preventDefault();
        splitBlob();
        break;
      case 'KeyW':
        event.preventDefault();
        ejectMass();
        break;
    }
  }, [splitBlob, ejectMass]);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touch = event.touches[0];
    if (touch.clientY < window.innerHeight / 2) {
      splitBlob();
    } else {
      ejectMass();
    }
  }, [splitBlob, ejectMass]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!player) return;
    event.preventDefault();
    
    const touch = event.touches[0];
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    
    // Add touch deadzone for better control
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const dx = touchX - centerX;
    const dy = touchY - centerY;
    const distance = Math.hypot(dx, dy);
    
    if (distance > 20) { // Deadzone radius
      setMousePosition({ x: touchX, y: touchY });
    }
  }, [player, setMousePosition]);

  // Add mobile-specific gesture handlers
  const handleTouchGestures = useCallback((event: TouchEvent) => {
    if (event.touches.length === 2) {
      // Handle pinch to zoom
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      // Update camera zoom based on pinch distance
      const zoom = Math.max(0.5, Math.min(2, distance / 300));
      setZoom(zoom);
    }
  }, [setZoom]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [handleKeyPress, handleTouchStart, handleTouchMove]);

  useKeyboardControls();

  // Filter visible objects
  const visibleBlobs = performanceManager?.getVisibleObjects(blobs, viewport) ?? [];
  const visibleFood = performanceManager?.getVisibleObjects(Array.from(food.values()), viewport) ?? [];

  // Apply quality settings to rendering
  const qualitySettings = gameSystems.getQualitySettings();

  useEffect(() => {
    return () => {
      // Clean up PIXI resources
      if (app) {
        app.stage?.removeAllListeners();
        app.destroy(true, { 
          children: true, 
          texture: true, 
          baseTexture: true 
        });
      }
      // Clean up systems
      visualEffects.current?.dispose();
      performanceManager?.dispose();
    };
  }, [app, performanceManager]);

  useEffect(() => {
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('WebGL context lost, attempting recovery...');
      
      if (app?.renderer) {
        app.renderer.reset();
        if (app.renderer instanceof PIXI.Renderer) {
          (app.renderer as any).gl.isContextLost = true;
        }
      }
    };

    const handleContextRestored = () => {
      console.log('WebGL context restored');
      if (app?.renderer) {
        if (app.renderer instanceof PIXI.Renderer) {
          (app.renderer as any).gl.isContextLost = false;
        }
        app.renderer.reset();
        app.render();
      }
    };

    window.addEventListener('webglcontextlost', handleContextLost);
    window.addEventListener('webglcontextrestored', handleContextRestored);

    return () => {
      window.removeEventListener('webglcontextlost', handleContextLost);
      window.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [app]);

  useEffect(() => {
    if (!socket) return;

    socket.on('ai:move', (data: { blobId: string, position: Position }) => {
      const blob = blobs.find(b => b.id === data.blobId);
      if (blob && trailSystem.current) {
        const speed = Math.hypot(
          data.position.x - blob.x,
          data.position.y - blob.y
        );
        trailSystem.current.updateTrail(
          blob.id,
          data.position,
          speed,
          blob.color
        );
      }
    });

    return () => {
      socket.off('ai:move');
    };
  }, [socket, blobs, visualEffects, trailSystem]);

  // Add this helper function
  const createEffect = (effect: PowerUpEffect | CollisionEffect | GrowthEffect, type: 'powerUp' | 'collision' | 'growth') => {
    if (!visualEffects.current) {
      console.warn(`Cannot create ${type} effect: Visual effects system not initialized`);
      return;
    }

    try {
      switch (type) {
        case 'powerUp':
          visualEffects.current.createPowerUpEffect(
            effect.position,
            effect.color
          );
          break;
        case 'collision':
          visualEffects.current.createCollisionEffect(
            effect.position,
            effect.color
          );
          break;
        case 'growth':
          visualEffects.current.createGrowthEffect(
            effect.position,
            effect.color
          );
          break;
      }
    } catch (error) {
      console.error(`Error creating ${type} effect:`, error);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="text-white text-xl">Loading Game...</div>
      </div>
    );
  }

  return (
    <>
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        options={{
          backgroundColor: 0x000000,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          powerPreference: 'high-performance',
          clearBeforeRender: true,
          forceCanvas: false,
          autoDensity: true,
          autoStart: true,
          preserveDrawingBuffer: true,
          premultipliedAlpha: false,
          hello: true,
          context: null,
          backgroundAlpha: 1,
          preferWebGLVersion: 2
        } as RenderOptions}
        onMount={handleMount}
      >
        <Container
          ref={containerRef}
          eventMode="static"
          interactiveChildren={true}
          onpointermove={handlePointerMove}
          onpointerdown={handlePointerMove}
          ontouchmove={handlePointerMove}
          position={containerRef.current?.position || new PIXI.Point(0, 0)}
          hitArea={new PIXI.Rectangle(0, 0, dimensions.width, dimensions.height)}
        >
          <Grid
            width={4000}
            height={4000}
            cellSize={50}
            color={0x333333}
            alpha={0.3}
          />
          {visibleBlobs.map((blob) => {
            const screenPos = worldToScreen(blob.x, blob.y);
            const screenTrail = blob.trail
              .slice(0, qualitySettings.trailLength)
              .map(pos => worldToScreen(pos.x, pos.y));
            
            return (
              <BlobErrorBoundary key={blob.id}>
                <Blob
                  {...blob}
                  x={screenPos.x}
                  y={screenPos.y}
                  trail={screenTrail}
                />
              </BlobErrorBoundary>
            );
          })}
          {visibleFood.map((f) => {
            const screen = worldToScreen(f.x, f.y);
            return (
              <Food 
                key={f.id}
                {...f} 
                x={screen.x} 
                y={screen.y} 
              />
            );
          })}
        </Container>
      </Stage>
      
      {isMobile && (
        <Suspense fallback={null}>
          <TouchControls />
        </Suspense>
      )}
      <GameHUD isMobile={isMobile} />
      <TutorialSystem />
      <Notifications notifications={notifications} />
    </>
  );
}