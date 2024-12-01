import React, { memo } from 'react';
import { motion, Variants } from 'framer-motion';
import { HUDState } from '../types/hud';
import { Tooltip } from '.';

interface StatsDisplayProps extends HUDState {
  compact?: boolean;
}

interface StatItemProps {
  label: string;
  value: string | number;
  color?: string;
  animate?: boolean;
  tooltip?: string;
}

const valueVariants: Variants = {
  initial: { scale: 1.2, color: '#22d3ee' },
  animate: { 
    scale: 1, 
    color: '#ffffff',
    transition: { duration: 0.3 }
  }
};

const StatItem = memo<StatItemProps>(({ 
  label, 
  value, 
  color = 'text-white', 
  animate = false,
  tooltip
}) => {
  const content = (
    <div className="flex items-center justify-between min-w-[120px]">
      <span className="text-gray-400">{label}:</span>
      {animate ? (
        <motion.span
          key={value}
          variants={valueVariants}
          initial="initial"
          animate="animate"
          className={`font-bold ${color}`}
        >
          {value}
        </motion.span>
      ) : (
        <span className={`font-bold ${color}`}>{value}</span>
      )}
    </div>
  );

  return tooltip ? (
    <Tooltip content={tooltip}>{content}</Tooltip>
  ) : content;
});

StatItem.displayName = 'StatItem';

const formatNumber = (num: number): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  });
  return formatter.format(num);
};

const getPingColor = (ping: number): string => {
  if (ping < 50) return 'text-green-400';
  if (ping < 100) return 'text-yellow-400';
  return 'text-red-400';
};

const getFPSColor = (fps: number): string => {
  if (fps >= 55) return 'text-green-400';
  if (fps >= 30) return 'text-yellow-400';
  return 'text-red-400';
};

export const StatsDisplay = memo<StatsDisplayProps>(({
  score,
  rank,
  fps,
  ping,
  compact = false
}) => {
  return (
    <div 
      className={`bg-black/50 rounded-lg p-4 backdrop-blur-sm ${compact ? 'scale-90' : ''}`}
      role="region"
      aria-label="Game Statistics"
    >
      <div className="space-y-2">
        <StatItem
          label="Score"
          value={formatNumber(score)}
          animate={true}
          tooltip="Your current game score"
        />
        <StatItem
          label="Rank"
          value={rank > 0 ? `#${rank}` : '-'}
          color={rank <= 3 ? 'text-yellow-400' : 'text-white'}
          tooltip="Your position on the leaderboard"
        />
        <StatItem
          label="FPS"
          value={Math.round(fps)}
          color={getFPSColor(fps)}
          tooltip={`Frames per second: ${fps >= 55 ? 'Excellent' : fps >= 30 ? 'Fair' : 'Poor'}`}
        />
        <StatItem
          label="Ping"
          value={`${ping}ms`}
          color={getPingColor(ping)}
          tooltip={`Network latency: ${ping < 50 ? 'Good' : ping < 100 ? 'Fair' : 'Poor'}`}
        />
      </div>
    </div>
  );
});

StatsDisplay.displayName = 'StatsDisplay';

export default StatsDisplay; 