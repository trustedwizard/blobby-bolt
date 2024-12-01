import React, { useEffect, useRef, useMemo } from 'react';
import { PowerUpCombo, PowerUpType } from '../types/powerups';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface Props {
  combo: PowerUpCombo;
  size: number;
}

const PARTICLE_COUNT = 50;
const PARTICLE_DECAY = 0.02;
const VELOCITY_RANGE = 4;
const SIZE_RANGE = { min: 2, max: 6 };

const COMBO_COLORS: Record<string, string[]> = {
  [`${PowerUpType.SPEED}_${PowerUpType.SHIELD}`]: ['#ffff00', '#00ff00', '#ffffff'],
  [`${PowerUpType.GHOST}_${PowerUpType.MASS}`]: ['#ff00ff', '#0000ff', '#ffffff'],
  [`${PowerUpType.SPEED}_${PowerUpType.SPLIT}`]: ['#ff0000', '#ff8800', '#ffffff']
};

export const ComboParticles: React.FC<Props> = React.memo(({ combo, size }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>();

  const colors = useMemo(() => 
    COMBO_COLORS[combo.types.join('_')] || ['#ffffff'],
    [combo.types]
  );

  const createParticle = (x: number, y: number): Particle => ({
    x,
    y,
    vx: (Math.random() - 0.5) * VELOCITY_RANGE,
    vy: (Math.random() - 0.5) * VELOCITY_RANGE,
    life: 1,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * (SIZE_RANGE.max - SIZE_RANGE.min) + SIZE_RANGE.min
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = size / 2;
    const centerY = size / 2;

    const animate = () => {
      ctx.clearRect(0, 0, size, size);

      // Add new particles
      if (particlesRef.current.length < PARTICLE_COUNT) {
        particlesRef.current.push(createParticle(centerX, centerY));
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= PARTICLE_DECAY;

        if (particle.life <= 0) return false;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `${particle.color}${Math.floor(particle.life * 255)
          .toString(16)
          .padStart(2, '0')}`;
        ctx.fill();

        return true;
      });

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        particlesRef.current = [];
      }
    };
  }, [combo, size, colors]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ width: size, height: size }}
      />
    </div>
  );
}); 