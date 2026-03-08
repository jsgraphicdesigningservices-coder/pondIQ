import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminData } from '@/hooks/usePondData';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Users, 
  Waves, 
  Bell, 
  Activity, 
  Wifi,
  ChevronRight,
  Shield,
  BarChart3,
  Loader2,
  Trash2,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminPanel() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { users, allPonds, systemAlerts, isLoading: dataLoading, refetch } = useAdminData();
  const [deletingPondId, setDeletingPondId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeletePond = async () => {
    if (!deletingPondId) return;
    
    try {
      setIsDeleting(true);
      
      // Delete all related data first
      await supabase.from('alerts').delete().eq('pond_id', deletingPondId);
      await supabase.from('sensor_readings').delete().eq('pond_id', deletingPondId);
      
      // Get devices for this pond
      const { data: devices } = await supabase
        .from('devices')
        .select('id')
        .eq('pond_id', deletingPondId);
      
      if (devices && devices.length > 0) {
        const deviceIds = devices.map(d => d.id);
        await supabase.from('device_schedules').delete().in('device_id', deviceIds);
        await supabase.from('devices').delete().eq('pond_id', deletingPondId);
      }
      
      // Finally delete the pond
      const { error } = await supabase
        .from('ponds')
        .delete()
        .eq('id', deletingPondId);
      
      if (error) throw error;
      
      toast.success('Pond removed successfully');
      refetch();
    } catch (error) {
      console.error('Error deleting pond:', error);
      toast.error('Failed to remove pond');
    } finally {
      setIsDeleting(false);
      setDeletingPondId(null);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect if not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card variant="elevated" className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="h-16 w-16 rounded-2xl bg-status-critical/10 mx-auto flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-status-critical" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-6">
              You don't have permission to access the admin panel.
            </p>
            <Button onClick={() => navigate('/')}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeAlerts = systemAlerts.filter(a => a.severity === 'warning' || a.severity === 'critical').length;

  return (
    <div className="min-h-screen bg-background pb-8">
      <Header title="Admin Panel" showBack />
      
      <main className="p-4 max-w-4xl mx-auto">
        {/* Admin View Header Banner */}
        <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Shield className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-700 dark:text-blue-400">Administrator Dashboard</h3>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
              You have read-only access to all ponds. Device controls are disabled for safety.
            </p>
          </div>
          <Badge className="bg-blue-500 text-white">
            Admin
          </Badge>
        </div>
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card variant="device">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dataLoading ? '-' : users.length}</p>
                  <p className="text-xs text-muted-foreground">Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card variant="device">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-status-safe/10 flex items-center justify-center">
                  <Waves className="h-5 w-5 text-status-safe" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dataLoading ? '-' : allPonds.length}</p>
                  <p className="text-xs text-muted-foreground">Total Ponds</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card variant="device">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-status-warning/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-status-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dataLoading ? '-' : activeAlerts}</p>
                  <p className="text-xs text-muted-foreground">Active Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card variant="device">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-device-auto/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-device-auto" />
                </div>
                <div>
                  <p className="text-2xl font-bold">99%</p>
                  <p className="text-xs text-muted-foreground">Uptime</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="ponds" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="ponds">All Ponds</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="logs">System Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="ponds" className="mt-0">
            <Card variant="elevated">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Pond Management</CardTitle>
                  <Badge variant="secondary">{allPonds.length} ponds</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {dataLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : allPonds.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No ponds registered yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allPonds.map(pond => (
                      <div
                        key={pond.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'h-10 w-10 rounded-xl flex items-center justify-center',
                            pond.status === 'online' ? 'bg-status-safe/10' : 'bg-status-warning/10'
                          )}>
                            <Wifi className={cn(
                              'h-5 w-5',
                              pond.status === 'online' ? 'text-status-safe' : 'text-status-warning'
                            )} />
                          </div>
                          <div>
                            <p className="font-medium">{pond.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{pond.ip}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right hidden sm:block mr-2">
                            <p className="text-sm text-muted-foreground">Owner: {pond.userName}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/admin/pond/${pond.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeletingPondId(pond.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-0">
            <Card variant="elevated">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">User Management</CardTitle>
                  <Badge variant="secondary">{users.length} users</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {dataLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No users registered yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users.map(u => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.id.substring(0, 8)}...</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                            {u.role}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {u.pondCount} pond{u.pondCount !== 1 ? 's' : ''}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="mt-0">
            <Card variant="elevated">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">System Logs</CardTitle>
                  <Button variant="outline" size="sm">
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {dataLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : systemAlerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No system logs yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {systemAlerts.map(log => (
                      <div
                        key={log.id}
                        className={cn(
                          'p-4 rounded-xl border-l-4',
                          log.severity === 'warning' 
                            ? 'border-l-status-warning bg-status-warning/5'
                            : log.severity === 'critical'
                            ? 'border-l-status-critical bg-status-critical/5'
                            : 'border-l-primary bg-primary/5'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-foreground">{log.message}</p>
                          <Badge 
                            variant={log.severity === 'critical' ? 'destructive' : 'secondary'}
                            className="ml-2"
                          >
                            {log.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{log.time}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingPondId} onOpenChange={() => setDeletingPondId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Pond Access</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the pond and all associated data including sensor readings, alerts, and device configurations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePond}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Pond'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
