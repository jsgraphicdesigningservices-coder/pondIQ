import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Waves, Mail, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const navigate = useNavigate();
  const { login, signup, resetPassword, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginEmail || !loginPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    
    try {
      await login(loginEmail, loginPassword);
      toast.success('Welcome back!');
      navigate('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error('Please enter your email address');
      return;
    }
    setIsSendingReset(true);
    try {
      await resetPassword(forgotEmail);
      toast.success('Password reset link sent! Check your email.');
      setShowForgotPassword(false);
      setForgotEmail('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send reset link');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupName || !signupEmail || !signupPassword || !signupConfirm) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (signupPassword !== signupConfirm) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (signupPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    try {
      await signup(signupEmail, signupPassword, signupName);
      toast.success('Account created successfully!');
      navigate('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Signup failed');
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/90 via-primary to-[hsl(180,70%,35%)] -z-10" />
      
      {/* Animated water-like shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-5">
        <motion.div
          animate={{ 
            x: [0, 30, 0],
            y: [0, -20, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ 
            x: [0, -20, 0],
            y: [0, 30, 0],
            scale: [1, 1.15, 1]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ 
            x: [0, 15, 0],
            y: [0, 15, 0],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl"
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center mb-4"
        >
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 shadow-xl border border-white/30"
          >
            <Waves className="h-7 w-7 text-white" strokeWidth={2} />
          </motion.div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Pond IQ</h1>
          <p className="text-white/80 text-center mt-2 text-sm">
            Intelligence for Pond Management
          </p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-xl overflow-hidden max-h-[calc(100vh-120px)]">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mx-3 mt-3 mb-0 w-[calc(100%-1.5rem)] bg-muted/50">
                <TabsTrigger value="login" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-0">
                <CardHeader className="pb-3 pt-2 px-4">
                  <CardTitle className="text-lg">Welcome back</CardTitle>
                  <CardDescription>
                    Sign in to monitor your ponds
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <form onSubmit={handleLogin} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="you@example.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="pl-10 h-10 bg-muted/30 border-muted focus:bg-white transition-colors"
                          autoComplete="email"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="pl-10 pr-10 h-10 bg-muted/30 border-muted focus:bg-white transition-colors"
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-10 text-sm font-semibold bg-gradient-to-r from-primary to-[hsl(180,70%,40%)] hover:opacity-90 transition-opacity shadow-lg" 
                      size="lg" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                  </form>

                  {/*
                  <div className="mt-4 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground text-center mb-2">Quick access</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setLoginEmail('farmer@aquafarm.demo');
                          setLoginPassword('demo123');
                        }}
                        className="text-[11px] h-8"
                      >
                        Farmer
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setLoginEmail('user@aquafarm.demo');
                          setLoginPassword('demo123');
                        }}
                        className="text-[11px] h-8"
                      >
                        User
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setLoginEmail('admin@aquafarm.demo');
                          setLoginPassword('demo123');
                        }}
                        className="text-[11px] h-8"
                      >
                        Admin
                      </Button>
                    </div>
                  </div>
                  */}

                  {/* Forgot Password Modal */}
                  {showForgotPassword && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 rounded-lg border border-primary/20 bg-primary/5"
                    >
                      <h4 className="text-sm font-semibold mb-1">Reset Password</h4>
                      <p className="text-xs text-muted-foreground mb-3">
                        Enter your email and we'll send you a reset link.
                      </p>
                      <form onSubmit={handleForgotPassword} className="space-y-3">
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            className="pl-10 h-10 bg-background"
                            autoComplete="email"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => { setShowForgotPassword(false); setForgotEmail(''); }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            size="sm"
                            className="flex-1"
                            disabled={isSendingReset}
                          >
                            {isSendingReset ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Send Reset Link'
                            )}
                          </Button>
                        </div>
                      </form>
                    </motion.div>
                  )}

                </CardContent>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <CardHeader className="pb-3 pt-2 px-4">
                  <CardTitle className="text-lg">Create account</CardTitle>
                  <CardDescription>
                    Start monitoring your aquaculture today
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <form onSubmit={handleSignup} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-sm font-medium">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="John Farmer"
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          className="pl-10 h-10 bg-muted/30 border-muted focus:bg-white transition-colors"
                          autoComplete="name"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="you@example.com"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          className="pl-10 h-10 bg-muted/30 border-muted focus:bg-white transition-colors"
                          autoComplete="email"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          className="pl-10 pr-10 h-10 bg-muted/30 border-muted focus:bg-white transition-colors"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm" className="text-sm font-medium">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-confirm"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={signupConfirm}
                          onChange={(e) => setSignupConfirm(e.target.value)}
                          className="pl-10 h-10 bg-muted/30 border-muted focus:bg-white transition-colors"
                          autoComplete="new-password"
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-10 text-sm font-semibold bg-gradient-to-r from-primary to-[hsl(180,70%,40%)] hover:opacity-90 transition-opacity shadow-lg" 
                      size="lg" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
