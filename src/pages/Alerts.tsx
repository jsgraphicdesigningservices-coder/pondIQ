import { useAlerts } from '@/hooks/usePondData';
import { Header } from '@/components/Header';
import { AlertItem } from '@/components/AlertItem';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Check, Filter } from 'lucide-react';

export default function Alerts() {
  const { alerts, acknowledgeAlert } = useAlerts();
  
  const activeAlerts = alerts.filter(a => !a.acknowledged);
  const acknowledgedAlerts = alerts.filter(a => a.acknowledged);

  const acknowledgeAll = () => {
    activeAlerts.forEach(alert => acknowledgeAlert(alert.id));
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <Header title="Alerts" showBack />
      
      <main className="p-4 max-w-2xl mx-auto">
        <Tabs defaultValue="active" className="w-full">
          <div className="flex items-center justify-between mb-4">
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
              <Button variant="outline" size="sm" onClick={acknowledgeAll}>
                <Check className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          <TabsContent value="active" className="mt-0">
            {activeAlerts.length > 0 ? (
              <div className="space-y-3 stagger-children">
                {activeAlerts.map(alert => (
                  <AlertItem
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={acknowledgeAlert}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="h-16 w-16 rounded-2xl bg-status-safe/10 mx-auto flex items-center justify-center mb-4">
                  <Bell className="h-8 w-8 text-status-safe" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">All Clear</h3>
                <p className="text-muted-foreground text-sm">
                  No active alerts. Your ponds are running smoothly.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            {acknowledgedAlerts.length > 0 ? (
              <div className="space-y-3">
                {acknowledgedAlerts.map(alert => (
                  <AlertItem
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={acknowledgeAlert}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="h-16 w-16 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4">
                  <Filter className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg text-foreground mb-2">No History</h3>
                <p className="text-muted-foreground text-sm">
                  Acknowledged alerts will appear here.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
