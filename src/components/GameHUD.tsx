import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { performanceMonitor } from '../utils/PerformanceMonitor.ts';
import PowerUpTimer from './PowerUpTimer';
import { Leaderboard } from './Leaderboard';
import StatsDisplay from './StatsDisplay';
import { MiniMap } from './MiniMap';
import { HUDState } from '../types/hud';
import { CONFIG } from '../constants/gameConfig';
import { PowerUpType, POWER_UP_TYPES } from '../types/powerups';

interface GameHUDProps {
  isMobile?: boolean;
}

interface PowerUpState {
  id: string;
  type: PowerUpType;
  timeRemaining: number;
  duration: number;
  icon: string;
}

export const GameHUD: React.FC<GameHUDProps> = ({ isMobile = false }) => {
  const { player, players, activePowerUps, viewport, socket } = useGameStore();
  const [hudState, setHudState] = useState<HUDState>({
    score: 0,
    rank: 0,
    fps: 0,
    ping: 0,
    activePowerUps: [],
    leaderboard: [],
    isExpanded: false
  });

  const updateHUD = useCallback(() => {
    if (!player) return;

    const playerList = Array.from(players.values());
    const sortedPlayers = playerList.sort((a, b) => b.score - a.score);
    const playerRank = sortedPlayers.findIndex(p => p.id === player.id) + 1;

    setHudState(prev => ({
      ...prev,
      score: player.score || 0,
      rank: playerRank,
      fps: Math.round(performanceMonitor.metrics.fps),
      activePowerUps: activePowerUps.map(p => {
        const powerUpType = p.type as keyof typeof POWER_UP_TYPES;
        return {
          id: p.id,
          type: POWER_UP_TYPES[powerUpType] as PowerUpType,
          timeRemaining: p.expiresAt - Date.now(),
          duration: CONFIG.powerUps.effectDurations[powerUpType],
          icon: `powerup-${p.type.toLowerCase()}`
        } as PowerUpState;
      }),
      leaderboard: sortedPlayers
        .slice(0, CONFIG.scoring.leaderboardSize)
        .map((p, index) => ({
          rank: index + 1,
          name: p.name,
          score: p.score,
          isPlayer: p.id === player.id
        }))
    }));
  }, [player, players, activePowerUps]);

  useEffect(() => {
    const interval = setInterval(updateHUD, 1000 / 30); // 30 fps updates
    return () => clearInterval(interval);
  }, [updateHUD]);

  useEffect(() => {
    if (!socket) return;

    let lastPingTime = Date.now();
    let pingInterval: NodeJS.Timeout;

    const handlePong = () => {
      const pingTime = Date.now() - lastPingTime;
      setHudState(prev => ({ ...prev, ping: pingTime }));
    };

    const startPingInterval = () => {
      pingInterval = setInterval(() => {
        lastPingTime = Date.now();
        socket.emit('ping');
      }, 2000);
    };

    socket.on('pong', handlePong);
    startPingInterval();
    lastPingTime = Date.now();
    socket.emit('ping');

    return () => {
      clearInterval(pingInterval);
      socket.off('pong', handlePong);
    };
  }, [socket]);

  const toggleExpanded = () => {
    setHudState(prev => ({ ...prev, isExpanded: !prev.isExpanded }));
  };

  if (!player) return null;

  const viewportForMinimap = {
    x: viewport.x,
    y: viewport.y,
    width: window.innerWidth / viewport.scale,
    height: window.innerHeight / viewport.scale
  };

  return (
    <div className="fixed inset-0 pointer-events-none">
      <div className={`absolute top-4 left-4 ${isMobile ? 'scale-75 origin-top-left' : ''}`}>
        <StatsDisplay {...hudState} compact={isMobile} />
      </div>

      {(!isMobile || hudState.isExpanded) && (
        <div className={`absolute top-4 right-4 ${isMobile ? 'scale-75 origin-top-right' : ''}`}>
          <Leaderboard entries={hudState.leaderboard} compact={isMobile} />
        </div>
      )}

      <div className={`absolute bottom-4 left-4 ${isMobile ? 'scale-75 origin-bottom-left' : ''}`}>
        <div className="flex flex-col gap-2">
          {hudState.activePowerUps.map(powerUp => (
            <PowerUpTimer 
              key={powerUp.id}
              id={powerUp.id}
              type={powerUp.type as PowerUpType}
              timeRemaining={powerUp.timeRemaining}
              duration={powerUp.duration}
              icon={powerUp.icon}
              compact={isMobile}
            />
          ))}
        </div>
      </div>

      {!isMobile && (
        <div className="absolute bottom-4 right-4">
          <MiniMap
            playerPosition={{ x: player.x, y: player.y }}
            visiblePlayers={Array.from(players.values())}
            viewport={viewportForMinimap}
            worldSize={CONFIG.game.worldSize}
          />
        </div>
      )}

      {isMobile && (
        <button
          className="absolute top-4 right-4 bg-black/50 rounded-full p-2 pointer-events-auto"
          onClick={toggleExpanded}
        >
          {hudState.isExpanded ? 'Collapse' : 'Expand'}
        </button>
      )}
    </div>
  );
}; 