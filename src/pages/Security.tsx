import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Shield, 
  Lock,
  Fingerprint,
  Smartphone,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Security() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(true);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }

    setIsChangingPassword(true);
    
    try {
      // Get the current user's email
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser?.email) {
        toast.error('User session not found. Please log in again.');
        setIsChangingPassword(false);
        return;
      }

      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword,
      });

      if (signInError) {
        toast.error('Current password is incorrect');
        setIsChangingPassword(false);
        return;
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast.error('Failed to update password');
        setIsChangingPassword(false);
        return;
      }

      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const securityScore = [biometricEnabled, twoFactorEnabled, sessionTimeout].filter(Boolean).length;
  const scorePercentage = Math.round((securityScore / 3) * 100);

  return (
    <div className="min-h-screen bg-background pb-8">
      <Header title="Security" showBack />
      
      <main className="p-4 max-w-lg mx-auto space-y-6">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-4 mb-2"
        >
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Security Settings</h2>
            <p className="text-sm text-muted-foreground">Protect your account</p>
          </div>
        </motion.div>

        {/* Security Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className={cn(
            'border-0 shadow-lg overflow-hidden',
            scorePercentage >= 66 ? 'bg-gradient-to-br from-status-safe/10 to-emerald-500/5' :
            scorePercentage >= 33 ? 'bg-gradient-to-br from-status-warning/10 to-orange-500/5' :
            'bg-gradient-to-br from-status-critical/10 to-red-500/5'
          )}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {scorePercentage >= 66 ? (
                    <CheckCircle2 className="h-5 w-5 text-status-safe" />
                  ) : (
                    <AlertTriangle className={cn(
                      'h-5 w-5',
                      scorePercentage >= 33 ? 'text-status-warning' : 'text-status-critical'
                    )} />
                  )}
                  <span className="font-semibold text-foreground">Security Score</span>
                </div>
                <span className={cn(
                  'text-2xl font-bold',
                  scorePercentage >= 66 ? 'text-status-safe' :
                  scorePercentage >= 33 ? 'text-status-warning' : 'text-status-critical'
                )}>
                  {scorePercentage}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${scorePercentage}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className={cn(
                    'h-full rounded-full',
                    scorePercentage >= 66 ? 'bg-status-safe' :
                    scorePercentage >= 33 ? 'bg-status-warning' : 'bg-status-critical'
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {scorePercentage >= 66 ? 'Your account is well protected' :
                 scorePercentage >= 33 ? 'Consider enabling more security features' :
                 'Enable security features to protect your account'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Security Features
          </h3>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-0 divide-y divide-border">
              {/* Biometric */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-10 w-10 rounded-xl flex items-center justify-center',
                    biometricEnabled ? 'bg-primary/10' : 'bg-muted'
                  )}>
                    <Fingerprint className={cn(
                      'h-5 w-5',
                      biometricEnabled ? 'text-primary' : 'text-muted-foreground'
                    )} />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Biometric Login</p>
                    <p className="text-xs text-muted-foreground">Use fingerprint or face ID</p>
                  </div>
                </div>
                <Switch 
                  checked={biometricEnabled} 
                  onCheckedChange={setBiometricEnabled}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              {/* Two Factor */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-10 w-10 rounded-xl flex items-center justify-center',
                    twoFactorEnabled ? 'bg-violet-500/10' : 'bg-muted'
                  )}>
                    <Smartphone className={cn(
                      'h-5 w-5',
                      twoFactorEnabled ? 'text-violet-500' : 'text-muted-foreground'
                    )} />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Two-Factor Auth</p>
                    <p className="text-xs text-muted-foreground">Extra verification step</p>
                  </div>
                </div>
                <Switch 
                  checked={twoFactorEnabled} 
                  onCheckedChange={setTwoFactorEnabled}
                  className="data-[state=checked]:bg-violet-500"
                />
              </div>

              {/* Session Timeout */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-10 w-10 rounded-xl flex items-center justify-center',
                    sessionTimeout ? 'bg-amber-500/10' : 'bg-muted'
                  )}>
                    <Lock className={cn(
                      'h-5 w-5',
                      sessionTimeout ? 'text-amber-500' : 'text-muted-foreground'
                    )} />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Auto Lock</p>
                    <p className="text-xs text-muted-foreground">Lock after 15 min inactive</p>
                  </div>
                </div>
                <Switch 
                  checked={sessionTimeout} 
                  onCheckedChange={setSessionTimeout}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Change Password */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Change Password
          </h3>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <KeyRound className="h-5 w-5 text-primary" />
                </div>
                <p className="font-medium text-foreground">Update your password</p>
              </div>

              <div className="relative">
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pr-10 h-12 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10 h-12 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 rounded-xl"
              />

              <Button 
                onClick={handleChangePassword}
                className="w-full h-12 rounded-xl"
                disabled={!currentPassword || !newPassword || !confirmPassword || isChangingPassword}
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Account Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
        >
          <Card className="border-0 shadow-lg bg-muted/30">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Signed in as</p>
              <p className="font-medium text-foreground">{user?.email || 'Unknown'}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sign Out */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline"
                className="w-full h-14 rounded-2xl text-lg font-semibold border-status-critical/30 text-status-critical hover:bg-status-critical/10 hover:text-status-critical"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Sign Out
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign out?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will need to sign in again to access your ponds and devices.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSignOut} className="bg-status-critical hover:bg-status-critical/90">
                  Sign Out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </motion.div>
      </main>
    </div>
  );
}
