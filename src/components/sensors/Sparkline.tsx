import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SparklineProps {
  data: number[];
  status: 'safe' | 'warning' | 'critical';
  height?: number;
}

export function Sparkline({ data, status, height = 32 }: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const padding = 2;
  const width = 100;
  const effectiveHeight = height - padding * 2;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = padding + effectiveHeight - ((value - min) / range) * effectiveHeight;
    return `${x},${y}`;
  }).join(' ');

  const statusColors = {
    safe: 'hsl(var(--status-safe))',
    warning: 'hsl(var(--status-warning))',
    critical: 'hsl(var(--status-critical))',
  };

  const gradientId = `sparkline-gradient-${status}-${Math.random().toString(36).substr(2, 9)}`;

  // Create area path
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <div className="w-full" style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={statusColors[status]} stopOpacity="0.3" />
            <stop offset="100%" stopColor={statusColors[status]} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Area fill */}
        <motion.polygon
          points={areaPoints}
          fill={`url(#${gradientId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
        
        {/* Line */}
        <motion.polyline
          points={points}
          fill="none"
          stroke={statusColors[status]}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        
        {/* Current value dot */}
        <motion.circle
          cx={width}
          cy={padding + effectiveHeight - ((data[data.length - 1] - min) / range) * effectiveHeight}
          r="2.5"
          fill={statusColors[status]}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        />
      </svg>
    </div>
  );
}
