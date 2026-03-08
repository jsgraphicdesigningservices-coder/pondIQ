import { cn } from '@/lib/utils';
import { Alert } from '@/types/aquaculture';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, AlertCircle, Check, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AlertItemProps {
  alert: Alert;
  onAcknowledge: (alertId: string) => void;
  className?: string;
}

export function AlertItem({ alert, onAcknowledge, className }: AlertItemProps) {
  const severityConfig = {
    info: {
      icon: Info,
      color: 'text-primary',
      bg: 'bg-primary/10',
      border: 'border-l-primary',
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-status-warning',
      bg: 'bg-status-warning/10',
      border: 'border-l-status-warning',
    },
    critical: {
      icon: AlertCircle,
      color: 'text-status-critical',
      bg: 'bg-status-critical/10',
      border: 'border-l-status-critical',
    },
  };

  const config = severityConfig[alert.severity];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'relative p-4 rounded-xl border-l-4 transition-all duration-200',
        config.border,
        alert.acknowledged ? 'bg-muted/50 opacity-60' : 'bg-card shadow-soft',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg', config.bg)}>
          <Icon className={cn('h-5 w-5', config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-foreground">{alert.pondName}</span>
            <span className="text-xs text-muted-foreground capitalize">
              {alert.type}
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {alert.message}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
          </div>
        </div>
        {!alert.acknowledged && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAcknowledge(alert.id)}
            className="shrink-0"
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
