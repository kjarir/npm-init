import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/supabase';
import { toast } from 'sonner';
import { User, Briefcase, ArrowLeft, Mail, Lock, UserCircle } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});

  const { signIn, signUp, user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && profile && !authLoading) {
      // Redirect based on role
      if (profile.role === 'client') {
        navigate('/client/dashboard');
      } else {
        navigate('/freelancer/dashboard');
      }
    }
  }, [user, profile, authLoading, navigate]);

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string; fullName?: string } = {};

    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }

    if (!isLogin && !fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    if (!isLogin && !selectedRole) {
      toast.error('Please select a role');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Invalid email or password');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Welcome back!');
        }
      } else {
        const { error } = await signUp(email, password, fullName, selectedRole!);
        if (error) {
          console.error('Signup error:', error);
          if (error.message.includes('already registered') || error.message.includes('already been registered')) {
            toast.error('This email is already registered. Try logging in instead.');
          } else if (error.message.includes('profile') || error.message.includes('Permission denied')) {
            // Profile creation might fail due to RLS, but user is created
            // Database trigger should create profile automatically
            toast.success('Account created! Your profile will be set up automatically. Please sign in.');
          } else {
            toast.error(`Signup failed: ${error.message}`);
          }
        } else {
          toast.success('Account created successfully! You can now sign in.');
        }
      }
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setSelectedRole(null);
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary p-12 flex-col justify-between">
        <Link to="/" className="flex items-center gap-3 text-primary-foreground">
          <div className="w-10 h-10 bg-accent border-3 border-primary-foreground brutal-shadow-sm flex items-center justify-center">
            <span className="font-display font-bold text-xl text-accent-foreground">B</span>
          </div>
          <span className="font-display font-bold text-2xl tracking-tight">BobPay</span>
        </Link>

        <div className="space-y-6">
          <h1 className="headline-lg text-primary-foreground">
            Secure Payments for Freelancers
          </h1>
          <p className="body-lg text-primary-foreground/80 max-w-md">
            Milestone-based escrow, AI verification, and fair dispute resolution. 
            Get paid what you deserve.
          </p>
        </div>

        <div className="text-primary-foreground/60 text-sm">
          Trusted by 10,000+ freelancers and clients worldwide
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-8">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="text-sm">Back to home</span>
          </Link>

          <div className="space-y-2">
            <h2 className="headline-md">{isLogin ? 'Welcome back' : 'Create account'}</h2>
            <p className="text-muted-foreground">
              {isLogin 
                ? 'Sign in to access your dashboard' 
                : 'Join BobPay and start working securely'}
            </p>
          </div>

          {/* Role Selection (Signup only) */}
          {!isLogin && (
            <div className="space-y-3">
              <Label className="label-mono text-muted-foreground">I am a</Label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedRole('freelancer')}
                  className={`p-4 border-3 border-foreground brutal-shadow-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none ${
                    selectedRole === 'freelancer' 
                      ? 'bg-accent text-accent-foreground' 
                      : 'bg-card'
                  }`}
                >
                  <User className="w-6 h-6 mx-auto mb-2" />
                  <span className="font-display font-semibold">Freelancer</span>
                  <p className="text-xs mt-1 opacity-80">I want to get paid</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('client')}
                  className={`p-4 border-3 border-foreground brutal-shadow-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none ${
                    selectedRole === 'client' 
                      ? 'bg-accent text-accent-foreground' 
                      : 'bg-card'
                  }`}
                >
                  <Briefcase className="w-6 h-6 mx-auto mb-2" />
                  <span className="font-display font-semibold">Client</span>
                  <p className="text-xs mt-1 opacity-80">I want to hire</p>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center gap-2">
                  <UserCircle size={16} />
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="border-3 border-foreground"
                />
                {errors.fullName && (
                  <p className="text-destructive text-sm">{errors.fullName}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail size={16} />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-3 border-foreground"
              />
              {errors.email && (
                <p className="text-destructive text-sm">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock size={16} />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-3 border-foreground"
              />
              {errors.password && (
                <p className="text-destructive text-sm">{errors.password}</p>
              )}
            </div>

            <Button 
              type="submit" 
              variant="accent" 
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                resetForm();
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
