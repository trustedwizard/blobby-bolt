import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import PowerUpTimer from './PowerUpTimer';
import { Leaderboard } from './Leaderboard';
import StatsDisplay from './StatsDisplay';
import { MiniMap } from './MiniMap';
import { HUDState } from '../types/hud';
import { PerformanceMonitor } from '../utils/performance';

export const GameHUD: React.FC = () => {
  const { player, activePowerUps, blobs, viewport, socket } = useGameStore();
  const [hudState, setHudState] = useState<HUDState>({
    score: 0,
    rank: 0,
    fps: 60,
    ping: 0,
    activePowerUps: [],
    leaderboard: []
  });

  useEffect(() => {
    const updateInterval = setInterval(() => {
      setHudState(prev => ({
        ...prev,
        score: player?.score || 0,
        fps: Math.round(PerformanceMonitor.metrics.fps),
        activePowerUps: activePowerUps.map(p => ({
          id: p.id,
          type: p.type,
          timeRemaining: p.expiresAt - Date.now(),
          duration: p.duration,
          icon: `powerup-${p.type.toLowerCase()}`
        })),
        leaderboard: blobs
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)
          .map((blob, index) => ({
            rank: index + 1,
            name: blob.name,
            score: blob.score,
            isPlayer: blob.id === player?.id
          }))
      }));
    }, 1000 / 30);

    return () => clearInterval(updateInterval);
  }, [player, activePowerUps, blobs]);

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

    // Set up socket listeners
    socket.on('pong', handlePong);
    startPingInterval();

    // Start first ping immediately
    lastPingTime = Date.now();
    socket.emit('ping');

    return () => {
      clearInterval(pingInterval);
      socket.off('pong', handlePong);
    };
  }, [socket]);

  return (
    <div className="fixed inset-0 pointer-events-none">
      <div className="absolute top-4 left-4">
        <StatsDisplay {...hudState} />
      </div>

      <div className="absolute top-4 right-4">
        <Leaderboard entries={hudState.leaderboard} />
      </div>

      <div className="absolute bottom-4 left-4">
        <div className="flex flex-col gap-2">
          {hudState.activePowerUps.map(powerUp => (
            <PowerUpTimer key={powerUp.id} {...powerUp} />
          ))}
        </div>
      </div>

      <div className="absolute bottom-4 right-4">
        <MiniMap
          playerPosition={player ? { x: player.x, y: player.y } : { x: 0, y: 0 }}
          visiblePlayers={blobs.map(b => ({
            x: b.x,
            y: b.y,
            color: b.color
          }))}
          viewport={viewport}
        />
      </div>
    </div>
  );
}; 