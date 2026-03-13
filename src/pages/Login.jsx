import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Checkbox } from '../components/ui/CheckBox';
import Icon from '../components/AppIcon';
import supabase from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (user && !isLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password) {
        setError('Please enter both email and password');
        setLoading(false);
        return;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message || 'Invalid email or password');
        setLoading(false);
        return;
      }

      if (!data?.user) {
        setError('Login failed - no user returned');
        setLoading(false);
        return;
      }

      // Check if user status is Active (treat missing/null as Active to avoid false blocks)
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('status')
        .eq('id', data.user.id)
        .single();

      if (profileError || !userProfile) {
        // Allow login if status cannot be read; app will re-verify after load
        console.warn('Unable to verify user status, proceeding:', profileError);
      } else {
        const status = userProfile.status ?? 'Active';
        if (status !== 'Active') {
          setError('Your account has been deactivated. Please contact the administrator.');
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
      }

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 500);
    } catch (err) {
      setError(err?.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMessage('');
    setForgotLoading(true);

    try {
      if (!forgotEmail) {
        setForgotError('Please enter your email address');
        setForgotLoading(false);
        return;
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setForgotError(resetError.message || 'Failed to send reset email');
        setForgotLoading(false);
        return;
      }

      setForgotMessage('Password reset link sent! Check your email and follow the instructions to reset your password.');
      setForgotEmail('');
      
      // Close modal after 5 seconds
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotMessage('');
      }, 5000);
    } catch (err) {
      setForgotError(err?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const videoStyle = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideInLeft {
      from { opacity: 0; transform: translateX(-30px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    .animate-fade { animation: fadeIn 0.8s ease-out; }
    .animate-slide-up { animation: slideUp 0.6s ease-out; }
    .animate-slide-in { animation: slideInLeft 0.8s ease-out; }
    .animate-pulse-slow { animation: pulse 3s ease-in-out infinite; }
  `;

  return (
    <div className="min-h-screen bg-white overflow-hidden relative">
      <style>{videoStyle}</style>
      
      {/* Background Video Layer */}
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50" />
        
        {/* Animated gradient background */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-0 left-0 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute top-1/4 right-0 w-72 h-72 bg-pink-200/30 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-rose-200/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Floating activity icons background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-12 text-6xl animate-pulse-slow">🎯</div>
          <div className="absolute top-1/3 right-20 text-5xl animate-pulse-slow" style={{ animationDelay: '0.5s' }}>🎨</div>
          <div className="absolute bottom-1/4 left-1/4 text-6xl animate-pulse-slow" style={{ animationDelay: '1s' }}>⚽</div>
          <div className="absolute bottom-20 right-1/3 text-5xl animate-pulse-slow" style={{ animationDelay: '1.5s' }}>🎭</div>
        </div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          
          {/* Left Side - Branding & Message */}
          <div className="hidden lg:flex flex-col justify-center space-y-8 animate-slide-in">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-xl">
                  <Icon name="Activity" size={28} color="white" />
                </div>
                <div>
                  <h1 className="text-3xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Activity Planner</h1>
                  <p className="text-sm font-semibold text-slate-600">by Capital Care Homes</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-4xl font-bold text-slate-900 leading-tight">
                Enriching Lives, Engaging Residents
              </h2>
              <p className="text-lg text-slate-600">
                A comprehensive activity management solution for care homes to organize, track, and deliver engaging activities that enhance residents' quality of life.
              </p>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100">
                    <Icon name="CheckCircle2" size={20} color="#9333ea" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Organize Activities</h3>
                  <p className="text-sm text-slate-600">Plan and schedule activities that keep residents engaged and happy</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-pink-100">
                    <Icon name="CheckCircle2" size={20} color="#ec4899" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Track Engagement</h3>
                  <p className="text-sm text-slate-600">Monitor attendance, feedback, and resident participation</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-rose-100">
                    <Icon name="CheckCircle2" size={20} color="#f43f5e" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Manage Resources</h3>
                  <p className="text-sm text-slate-600">Track equipment, expenses, and allocations efficiently</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="animate-slide-up">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-purple-100 p-8 lg:p-10 space-y-6">
              {/* Header */}
              <div className="text-center lg:text-left space-y-2">
                <h3 className="text-3xl font-bold text-slate-900">Welcome Back</h3>
                <p className="text-slate-600">Sign in to manage your care home's activities</p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-slide-up">
                  <Icon name="AlertCircle" size={20} color="#dc2626" />
                  <p className="text-red-700 text-sm font-medium">{error}</p>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                  <Input
                    type="email"
                    placeholder="your@carehome.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 pr-12 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      tabIndex={-1}
                    >
                      <Icon name={showPassword ? "EyeOff" : "Eye"} size={20} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    label="Remember me"
                  />
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:shadow-xl transition-all mt-6"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Icon name="Loader2" size={18} className="animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>

              {/* Security Note */}
              <div className="pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500 text-center flex items-center justify-center gap-2">
                  <Icon name="Lock" size={14} />
                  Your data is encrypted and secure
                </p>
              </div>
            </div>

            {/* Mobile Branding */}
            <div className="lg:hidden mt-6 text-center">
              <div className="inline-flex items-center gap-2 justify-center mb-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
                  <Icon name="Activity" size={20} color="white" />
                </div>
                <div>
                  <p className="text-lg font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Activity Planner</p>
                  <p className="text-xs font-semibold text-slate-600">Capital Care Homes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
        <div className="text-center text-xs text-slate-500">
          <p>© 2025 Capital Care Homes. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-2">
            <a href="#" className="hover:text-slate-700 transition-colors">Privacy Policy</a>
            <span>•</span>
            <a href="#" className="hover:text-slate-700 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="animate-slide-up bg-white rounded-2xl shadow-2xl border border-purple-100 p-8 w-full max-w-md">
            {/* Close Button */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Reset Password</h3>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotError('');
                  setForgotMessage('');
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <Icon name="X" size={24} />
              </button>
            </div>

            <p className="text-slate-600 mb-6">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            {/* Success Message */}
            {forgotMessage && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 animate-slide-up">
                <Icon name="CheckCircle2" size={20} color="#10b981" />
                <p className="text-emerald-700 text-sm font-medium">{forgotMessage}</p>
              </div>
            )}

            {/* Error Message */}
            {forgotError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-slide-up">
                <Icon name="AlertCircle" size={20} color="#dc2626" />
                <p className="text-red-700 text-sm font-medium">{forgotError}</p>
              </div>
            )}

            {/* Form */}
            {!forgotMessage && (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                  <Input
                    type="email"
                    placeholder="your@carehome.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all bg-white"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotError('');
                      setForgotMessage('');
                      setForgotEmail('');
                    }}
                    className="flex-1 py-3 px-4 border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:border-slate-300 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {forgotLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Icon name="Loader2" size={18} className="animate-spin" />
                        Sending...
                      </span>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;

