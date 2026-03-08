import { useNavigate } from 'react-router-dom';
import { usePondData } from '@/hooks/usePondData';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { PondCard } from '@/components/PondCard';
import { AddPondDialog } from '@/components/AddPondDialog';
import { Badge } from '@/components/ui/badge';
import { Waves, Loader2, ShieldCheck } from 'lucide-react';

export default function PondSelection() {
  const navigate = useNavigate();
  const { ponds, isLoading, refetch } = usePondData();
  const { isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <Header alertCount={0} />
      
      <main className="p-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-foreground">
                {isAdmin ? 'All Ponds' : 'My Ponds'}
              </h2>
              {isAdmin && (
                <Badge variant="secondary" className="gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20">
                  <ShieldCheck className="h-3 w-3" />
                  Admin View
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {isAdmin 
                ? 'Viewing all ponds in the system (read-only)'
                : 'Select a pond to view monitoring dashboard'
              }
            </p>
          </div>
          {!isAdmin && <AddPondDialog onSuccess={() => refetch()} />}
        </div>

        <div className="space-y-4 stagger-children">
          {ponds.map((pond) => (
            <PondCard
              key={pond.id}
              pond={pond}
              onClick={() => navigate(`/pond/${pond.id}`)}
              showOwnerBadge={isAdmin}
            />
          ))}
        </div>

        {ponds.length === 0 && (
          <div className="text-center py-12">
            <div className="h-16 w-16 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4">
              <Waves className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg text-foreground mb-2">
              No Ponds Assigned
            </h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
              {isAdmin 
                ? 'No ponds have been registered in the system yet.'
                : 'No ponds are assigned to this account. Contact your administrator or add a new pond.'
              }
            </p>
            {!isAdmin && <AddPondDialog onSuccess={() => refetch()} />}
          </div>
        )}
      </main>
    </div>
  );
}
