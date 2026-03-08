import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import { Plus, Loader2, Wifi, MapPin, Tag } from 'lucide-react';

const pondSchema = z.object({
  name: z.string().min(1, 'Pond name is required').max(100, 'Name too long'),
  device_ip: z.string()
    .min(1, 'Device IP is required')
    .regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, 'Invalid IP address format'),
  location: z.string().max(200, 'Location too long').optional(),
});

type PondFormData = z.infer<typeof pondSchema>;

interface AddPondDialogProps {
  onSuccess?: () => void;
}

export function AddPondDialog({ onSuccess }: AddPondDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PondFormData>({
    resolver: zodResolver(pondSchema),
    defaultValues: {
      name: '',
      device_ip: '',
      location: '',
    },
  });

  const onSubmit = async (data: PondFormData) => {
    if (!user) {
      toast.error('You must be logged in to add a pond');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('ponds').insert({
        name: data.name,
        device_ip: data.device_ip,
        location: data.location || null,
        user_id: user.id,
      });

      if (error) {
        throw error;
      }

      toast.success('Pond added successfully!');
      reset();
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error adding pond:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add pond');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Pond
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Pond</DialogTitle>
          <DialogDescription>
            Connect a new IoT device to monitor your pond.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Pond Name *</Label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                placeholder="e.g., Pond 1"
                {...register('name')}
                className="pl-10"
              />
            </div>
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="device_ip">Device IP Address *</Label>
            <div className="relative">
              <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="device_ip"
                placeholder="e.g., 192.168.1.100"
                {...register('device_ip')}
                className="pl-10"
              />
            </div>
            {errors.device_ip && (
              <p className="text-sm text-destructive">{errors.device_ip.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              The IP address of your IoT monitoring device
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location (Optional)</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                placeholder="e.g., North Farm Section A"
                {...register('location')}
                className="pl-10"
              />
            </div>
            {errors.location && (
              <p className="text-sm text-destructive">{errors.location.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Pond
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
