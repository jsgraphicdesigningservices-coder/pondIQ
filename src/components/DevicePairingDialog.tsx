import { useState } from 'react';
import { useDevicePairing } from '@/hooks/useDevicePairing';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Plus, 
  Loader2, 
  Wifi, 
  MapPin, 
  Tag, 
  Check, 
  Cpu,
  ArrowRight,
  Info,
  ShieldCheck,
  Link2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

interface DevicePairingDialogProps {
  onSuccess?: (pondId: string) => void;
}

type Step = 'info' | 'create' | 'success';

export function DevicePairingDialog({ onSuccess }: DevicePairingDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('info');
  const [name, setName] = useState('');
  const [deviceIp, setDeviceIp] = useState('');
  const [location, setLocation] = useState('');
  const [pondId, setPondId] = useState('');
  const [linkedPondId, setLinkedPondId] = useState<string | null>(null);
  
  const { isPairing, linkPondToOwner } = useDevicePairing();
  const { user } = useAuth();

  const handleCreate = async () => {
    if (!pondId.trim()) {
      toast.error('Pond ID from ESP32 is required');
      return;
    }
    if (!name.trim()) {
      toast.error('Pond name is required');
      return;
    }
    if (!deviceIp.trim()) {
      toast.error('Device IP is required');
      return;
    }

    const result = await linkPondToOwner(pondId.trim().toUpperCase(), name, deviceIp, location);
    
    if (result.success) {
      setLinkedPondId(pondId.trim().toUpperCase());
      setStep('success');
    }
  };

  const handleClose = () => {
    if (linkedPondId) {
      onSuccess?.(linkedPondId);
    }
    setOpen(false);
    setStep('info');
    setName('');
    setDeviceIp('');
    setLocation('');
    setPondId('');
    setLinkedPondId(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => o ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Device
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <AnimatePresence mode="wait">
          {step === 'info' && (
            <motion.div
              key="info"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  How Device Pairing Works
                </DialogTitle>
                <DialogDescription>
                  Connect your ESP32 device to your account
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary">1</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Get Pond ID from ESP32</h4>
                        <p className="text-xs text-muted-foreground">
                          Your ESP32 displays a unique <strong>Pond ID</strong> on first boot or config portal.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary">2</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Enter Pond ID in App</h4>
                        <p className="text-xs text-muted-foreground">
                          Type the Pond ID here to link the device to your account.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary">3</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Device Locked to Your Account</h4>
                        <p className="text-xs text-muted-foreground">
                          Your login credentials become the <strong>Owner</strong> of this pond.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-status-safe/20 flex items-center justify-center flex-shrink-0">
                        <Check className="h-4 w-4 text-status-safe" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Fully Isolated & Secure</h4>
                        <p className="text-xs text-muted-foreground">
                          Only you can see & control this pond. No one else can access it.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50">
                  <CardContent className="p-3">
                    <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-status-safe" />
                      Security Model
                    </h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Your account UID = Pond Owner</li>
                      <li>• Device locked to your login credentials</li>
                      <li>• Firebase rules enforce ownership server-side</li>
                      <li>• No one else can claim this device</li>
                    </ul>
                  </CardContent>
                </Card>

                <Button onClick={() => setStep('create')} className="w-full">
                  Continue to Setup
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-primary" />
                  Link ESP32 Device
                </DialogTitle>
                <DialogDescription>
                  Enter the Pond ID from your ESP32 to claim ownership
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Owner Info */}
                <Card className="border-status-safe/30 bg-status-safe/5">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="h-4 w-4 text-status-safe" />
                      <span className="text-xs font-medium">Owner Account (You)</span>
                    </div>
                    <p className="text-sm font-mono text-muted-foreground truncate">
                      {user?.email || 'Not logged in'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This pond will be locked to your account
                    </p>
                  </CardContent>
                </Card>

                {/* Pond ID Input - Main Focus */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <Cpu className="h-4 w-4" />
                    Pond ID from ESP32 *
                  </Label>
                  <Input
                    placeholder="e.g., POND_ABC123XYZ"
                    value={pondId}
                    onChange={(e) => setPondId(e.target.value.toUpperCase())}
                    className="font-mono text-lg tracking-wide uppercase"
                  />
                  <p className="text-xs text-muted-foreground">
                    Find this on your ESP32's display or config portal
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Pond Name *</Label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="e.g., Main Fish Pond"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Device IP Address *</Label>
                  <div className="relative">
                    <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="e.g., 192.168.1.100"
                      value={deviceIp}
                      onChange={(e) => setDeviceIp(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The static IP assigned to your ESP32
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Location (Optional)</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="e.g., North Farm Area"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep('info')}
                    className="flex-1"
                    disabled={isPairing}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleCreate}
                    className="flex-1"
                    disabled={isPairing || !pondId.trim() || !name.trim() || !deviceIp.trim()}
                  >
                    {isPairing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Linking...
                      </>
                    ) : (
                      <>
                        <Link2 className="h-4 w-4 mr-2" />
                        Link Device
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'success' && linkedPondId && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-status-safe">
                  <Check className="h-5 w-5" />
                  Device Linked Successfully!
                </DialogTitle>
                <DialogDescription>
                  This ESP32 is now locked to your account
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Owner Confirmation */}
                <Card className="border-status-safe/30 bg-status-safe/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="h-5 w-5 text-status-safe" />
                      <span className="text-sm font-medium text-status-safe">Owner Assigned</span>
                    </div>
                    <p className="text-sm font-mono text-muted-foreground truncate">
                      {user?.email}
                    </p>
                    <div className="mt-3 pt-3 border-t border-status-safe/20">
                      <p className="text-xs text-muted-foreground mb-1">Linked Pond ID</p>
                      <code className="text-sm font-mono font-bold text-primary">{linkedPondId}</code>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50">
                  <CardContent className="p-3">
                    <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
                      <Cpu className="h-3.5 w-3.5" />
                      What Happens Now
                    </h4>
                    <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                      <li>Your ESP32 will connect to Firebase automatically</li>
                      <li>Sensor data will appear in your dashboard</li>
                      <li>You can control devices remotely</li>
                      <li>Only your account can access this pond</li>
                    </ul>
                    <div className="mt-3 p-2 bg-background rounded border border-dashed">
                      <p className="text-xs text-muted-foreground">
                        <strong>Fully Secure</strong> — This device is locked to your login credentials.
                        No one else can claim or access this pond.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Button onClick={handleClose} className="w-full">
                  Done
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
