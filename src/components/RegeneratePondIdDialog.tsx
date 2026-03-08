import { useState } from 'react';
import { ref, set, get } from 'firebase/database';
import { database } from '@/lib/firebase';
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
  RefreshCw, 
  Loader2, 
  Copy, 
  Check,
  AlertTriangle,
  Cpu
} from 'lucide-react';

interface RegeneratePondIdDialogProps {
  pondId: string;
  pondName: string;
  onRegenerate?: (newPondId: string) => void;
}

// Generate a unique pond ID
function generateUniquePondId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 6);
  return `POND_${timestamp}_${randomPart}`.toUpperCase();
}

export function RegeneratePondIdDialog({ 
  pondId, 
  pondName,
  onRegenerate 
}: RegeneratePondIdDialogProps) {
  const [open, setOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [newPondId, setNewPondId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRegenerate = async () => {
    if (!database) {
      toast.error('Database not connected');
      return;
    }

    setIsRegenerating(true);
    try {
      // Generate new Pond ID
      const generatedId = generateUniquePondId();
      
      // Get current pond data
      const currentDataSnapshot = await get(ref(database, `ponds/${pondId}`));
      const currentData = currentDataSnapshot.val();
      
      if (!currentData) {
        throw new Error('Pond not found in Firebase');
      }

      // Copy data to new path
      await set(ref(database, `ponds/${generatedId}`), {
        ...currentData,
        previousPondId: pondId,
        migratedAt: Date.now(),
      });

      // Mark old path as migrated (don't delete to preserve history)
      await set(ref(database, `ponds/${pondId}/config/migratedTo`), generatedId);
      await set(ref(database, `ponds/${pondId}/config/migrated`), true);

      setNewPondId(generatedId);
      toast.success('New Pond ID generated! Update your ESP32 device.');
      onRegenerate?.(generatedId);
    } catch (error) {
      console.error('Error regenerating Pond ID:', error);
      toast.error('Failed to regenerate Pond ID');
    } finally {
      setIsRegenerating(false);
    }
  };

  const copyPondId = () => {
    if (newPondId) {
      navigator.clipboard.writeText(newPondId);
      setCopied(true);
      toast.success('New Pond ID copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setNewPondId(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => o ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {!newPondId ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                Regenerate Pond ID
              </DialogTitle>
              <DialogDescription>
                Generate a new Pond ID for <strong>{pondName}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Card className="border-status-warning/30 bg-status-warning/5">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-status-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-status-warning">Important</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        After regenerating, you must update your ESP32 device with the new Pond ID. 
                        The old ID will no longer receive data.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label className="text-sm">Current Pond ID</Label>
                <Input
                  readOnly
                  value={pondId}
                  className="font-mono text-sm text-muted-foreground"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={isRegenerating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRegenerate}
                  className="flex-1"
                  disabled={isRegenerating}
                >
                  {isRegenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-status-safe">
                <Check className="h-5 w-5" />
                New Pond ID Generated!
              </DialogTitle>
              <DialogDescription>
                Update your ESP32 with the new Pond ID below
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  New Pond ID <span className="text-muted-foreground">(for ESP32)</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={newPondId}
                    className="font-mono font-bold text-lg text-primary tracking-wide"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyPondId}
                    className="flex-shrink-0"
                  >
                    {copied ? <Check className="h-4 w-4 text-status-safe" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Card className="bg-muted/50">
                <CardContent className="p-3">
                  <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
                    <Cpu className="h-3.5 w-3.5" />
                    Update Your ESP32
                  </h4>
                  <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                    <li>Reset your ESP32 to AP mode</li>
                    <li>Connect to its config portal</li>
                    <li>Enter the new Pond ID</li>
                    <li>Save and reboot</li>
                  </ol>
                </CardContent>
              </Card>

              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
