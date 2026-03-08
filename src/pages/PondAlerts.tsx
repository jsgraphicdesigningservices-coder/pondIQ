import { useParams, useNavigate } from 'react-router-dom';
import { useAlerts, usePondData } from '@/hooks/usePondData';
import { Header } from '@/components/Header';
import { AlertItem } from '@/components/AlertItem';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Check, Filter, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PondAlerts() {
  const { pondId } = useParams<{ pondId: string }>();
  const navigate = useNavigate();
  const { ponds, isLoading: pondsLoading } = usePondData();
  const { alerts, acknowledgeAlert } = useAlerts();
  
  const pond = ponds.find(p => p.id === pondId) || (ponds.length === 1 ? ponds[0] : null);
  const activePondId = pond?.id || pondId || '';
  
  const pondAlerts = alerts.filter(a => a.pondId === activePondId);
  const activeAlerts = pondAlerts.filter(a => !a.acknowledged);
  const acknowledgedAlerts = pondAlerts.filter(a => a.acknowledged);

  if (pondsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pond) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Pond Not Found</h2>
          <Button onClick={() => navigate('/')}>Go Back</Button>
        </div>
      </div>
    );
  }

  const acknowledgeAll = () => {
    activeAlerts.forEach(alert => acknowledgeAlert(alert.id));
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <Header title="Alerts" showBack />
      
      <main className="p-4 max-w-lg mx-auto">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 mb-6"
        >
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-status-warning to-orange-600 flex items-center justify-center shadow-lg relative">
            <Bell className="h-6 w-6 text-white" />
            {activeAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-status-critical text-[10px] font-bold text-white flex items-center justify-center">
                {activeAlerts.length}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{pond.name}</h2>
            <p className="text-xs text-muted-foreground">
              {activeAlerts.length} active alerts
            </p>
          </div>
        </motion.div>

        <Tabs defaultValue="active" className="w-full">
          <motion.div 
            className="flex items-center justify-between mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <TabsList>
              <TabsTrigger value="active" className="relative">
                Active
                {activeAlerts.length > 0 && (
                  <span className="ml-1.5 h-5 w-5 rounded-full bg-status-critical text-[10px] font-bold text-status-critical-foreground flex items-center justify-center">
                    {activeAlerts.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            
            {activeAlerts.length > 0 && (
              <Button variant="outline" size="sm" onClick={acknowledgeAll} className="rounded-xl">
                <Check className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </motion.div>

          <TabsContent value="active" className="mt-0">
            {activeAlerts.length > 0 ? (
              <div className="space-y-3">
                {activeAlerts.map((alert, index) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.15 + index * 0.1 }}
                  >
                    <AlertItem
                      alert={alert}
                      onAcknowledge={acknowledgeAlert}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div 
                className="text-center py-12"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="h-16 w-16 rounded-2xl bg-status-safe/10 mx-auto flex items-center justify-center mb-4">
                  <Bell className="h-8 w-8 text-status-safe" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">All Clear</h3>
                <p className="text-muted-foreground text-sm">
                  No active alerts for this pond.
                </p>
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            {acknowledgedAlerts.length > 0 ? (
              <div className="space-y-3">
                {acknowledgedAlerts.map((alert, index) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <AlertItem
                      alert={alert}
                      onAcknowledge={acknowledgeAlert}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div 
                className="text-center py-12"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="h-16 w-16 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4">
                  <Filter className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">No History</h3>
                <p className="text-muted-foreground text-sm">
                  Acknowledged alerts will appear here.
                </p>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
