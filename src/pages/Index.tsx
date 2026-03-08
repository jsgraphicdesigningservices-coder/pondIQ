import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePondData } from '@/hooks/usePondData';
import { Loader2 } from 'lucide-react';
import PondHome from './PondHome';
import PondSelection from './PondSelection';

export default function Index() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, isAdmin } = useAuth();
  const { ponds, isLoading: pondsLoading } = usePondData();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Redirect admins to admin panel
  useEffect(() => {
    if (!authLoading && isAuthenticated && isAdmin) {
      navigate('/admin');
    }
  }, [authLoading, isAuthenticated, isAdmin, navigate]);

  if (authLoading || pondsLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your ponds...</p>
      </div>
    );
  }

  if (!isAuthenticated || isAdmin) {
    return null;
  }

  // Keep spinner-only when no ponds are available to avoid transient empty-state flashes.
  if (ponds.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your ponds...</p>
      </div>
    );
  }

  // Single pond user → go to pond home with action buttons
  if (ponds.length === 1) {
    return <PondHome />;
  }

  // Multi-pond user → show pond selection
  return <PondSelection />;
}
