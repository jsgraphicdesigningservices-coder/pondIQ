import { cn } from '@/lib/utils';
import { ScheduleStatus } from '@/types/schedule';
import { Clock, Play, Check, Pause, AlertCircle } from 'lucide-react';

interface ScheduleStatusBadgeProps {
  status: ScheduleStatus;
  className?: string;
}

const statusConfig: Record<ScheduleStatus, { 
  label: string; 
  color: string; 
  bg: string;
  icon: React.ElementType;
}> = {
  upcoming: { 
    label: 'Upcoming', 
    color: 'text-blue-600', 
    bg: 'bg-blue-500/10 border-blue-500/20',
    icon: Clock,
  },
  running: { 
    label: 'Running', 
    color: 'text-status-safe', 
    bg: 'bg-status-safe/10 border-status-safe/20',
    icon: Play,
  },
  completed: { 
    label: 'Completed', 
    color: 'text-muted-foreground', 
    bg: 'bg-muted/50 border-muted',
    icon: Check,
  },
  disabled: { 
    label: 'Disabled', 
    color: 'text-muted-foreground', 
    bg: 'bg-muted/30 border-muted',
    icon: Pause,
  },
  pending: { 
    label: 'Pending', 
    color: 'text-status-warning', 
    bg: 'bg-status-warning/10 border-status-warning/20',
    icon: AlertCircle,
  },
};

export function ScheduleStatusBadge({ status, className }: ScheduleStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <div className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border',
      config.bg,
      config.color,
      className
    )}>
      <Icon className="h-3 w-3" />
      {config.label}
    </div>
  );
}
