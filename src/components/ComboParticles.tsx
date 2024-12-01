import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { PowerUpCombo } from '../types/powerups';

const ParticleContainer = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
`;

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

export const ComboParticles: React.FC<Props> = ({ combo, size }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>();

  const getComboColors = (comboName: string): string[] => {
    switch (comboName) {
      case 'SPEED_SHIELD':
        return ['#ffff00', '#00ff00', '#ffffff'];
      case 'MAGNET_GRAVITY':
        return ['#ff00ff', '#0000ff', '#ffffff'];
      case 'TELEPORT_SPLIT':
        return ['#ff0000', '#ff8800', '#ffffff'];
      default:
        return ['#ffffff'];
    }
  };

  const createParticle = (x: number, y: number, colors: string[]): Particle => ({
    x,
    y,
    vx: (Math.random() - 0.5) * 4,
    vy: (Math.random() - 0.5) * 4,
    life: 1,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 4 + 2
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = getComboColors(combo.types.join('_'));
    const centerX = size / 2;
    const centerY = size / 2;

    const animate = () => {
      ctx.clearRect(0, 0, size, size);

      // Add new particles
      if (particlesRef.current.length < 50) {
        particlesRef.current.push(createParticle(centerX, centerY, colors));
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.02;

        if (particle.life <= 0) return false;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `${particle.color}${Math.floor(particle.life * 255).toString(16).padStart(2, '0')}`;
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
  }, [combo, size]);

  return (
    <ParticleContainer>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ width: size, height: size }}
      />
    </ParticleContainer>
  );
}; 