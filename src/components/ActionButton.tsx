import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  onClick?: () => void;
  variant?: 'primary' | 'sensors' | 'devices' | 'reports' | 'alerts' | 'cameras';
  badge?: number;
  className?: string;
}

const variantStyles = {
  primary: {
    bg: 'bg-gradient-to-br from-primary to-primary/80',
    iconBg: 'bg-primary-foreground/20',
    text: 'text-primary-foreground',
    glow: 'shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.4)]',
  },
  sensors: {
    bg: 'bg-gradient-to-br from-status-safe to-emerald-600',
    iconBg: 'bg-white/20',
    text: 'text-white',
    glow: 'shadow-[0_8px_30px_-6px_hsl(var(--status-safe)/0.4)]',
  },
  devices: {
    bg: 'bg-gradient-to-br from-[#0a3652] via-[#0f5168] to-[#18756c]',
    iconBg: 'bg-white/15',
    text: 'text-white',
    glow: 'shadow-[0_10px_32px_-8px_rgba(10,54,82,0.55)]',
  },
  reports: {
    bg: 'bg-gradient-to-br from-blue-500 to-cyan-600',
    iconBg: 'bg-white/20',
    text: 'text-white',
    glow: 'shadow-[0_8px_30px_-6px_rgba(59,130,246,0.4)]',
  },
  alerts: {
    bg: 'bg-gradient-to-br from-status-warning to-orange-600',
    iconBg: 'bg-white/20',
    text: 'text-white',
    glow: 'shadow-[0_8px_30px_-6px_hsl(var(--status-warning)/0.4)]',
  },
  cameras: {
    bg: 'bg-gradient-to-br from-[#0e4f64] via-[#178070] to-[#2c9b69]',
    iconBg: 'bg-white/15',
    text: 'text-white',
    glow: 'shadow-[0_10px_32px_-8px_rgba(23,128,112,0.5)]',
  },
};

export function ActionButton({ 
  icon: Icon, 
  label, 
  description, 
  onClick, 
  variant = 'primary',
  badge,
  className 
}: ActionButtonProps) {
  const styles = variantStyles[variant];

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'relative w-full p-6 rounded-3xl overflow-hidden',
        'flex flex-col items-center justify-center gap-3',
        'transition-all duration-300',
        styles.bg,
        styles.glow,
        'hover:scale-[1.02] active:scale-[0.98]',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        className
      )}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white blur-3xl transform translate-x-8 -translate-y-8" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white blur-2xl transform -translate-x-4 translate-y-4" />
      </div>

      {/* Badge */}
      {badge !== undefined && badge > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 h-6 min-w-6 px-1.5 rounded-full bg-status-critical text-status-critical-foreground text-xs font-bold flex items-center justify-center"
        >
          {badge}
        </motion.span>
      )}

      {/* Icon container with pulse effect */}
      <motion.div 
        className={cn(
          'relative h-16 w-16 rounded-2xl flex items-center justify-center',
          styles.iconBg
        )}
        whileHover={{ rotate: [0, -5, 5, 0] }}
        transition={{ duration: 0.5 }}
      >
        <Icon className={cn('h-8 w-8', styles.text)} strokeWidth={2} />
        
        {/* Subtle pulse ring */}
        <motion.div
          className={cn('absolute inset-0 rounded-2xl border-2 border-white/30')}
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      {/* Text content */}
      <div className="relative text-center">
        <p className={cn('text-lg font-bold', styles.text)}>{label}</p>
        {description && (
          <p className={cn('text-sm opacity-80 mt-0.5', styles.text)}>
            {description}
          </p>
        )}
      </div>
    </motion.button>
  );
}
