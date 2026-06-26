import { useState, useEffect } from 'react';
import { Bug, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GoogleLogin } from '@react-oauth/google';
import { motion } from 'framer-motion';

export default function Login({ isSignupMode = false }) {
  const { login, signup, loginWithGoogleToken, navigate, verifyOtp, apiRequest } = useApp();
  const isSignup = isSignupMode;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [forgotState, setForgotState] = useState('NONE'); // 'NONE' | 'REQUEST' | 'RESET'
  const [newPassword, setNewPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    setForgotState('NONE');
    setError('');
    setSuccessMessage('');
    setOtp('');
    setNewPassword('');
  }, [isSignupMode]);

  const handleSendResetOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    const { data, error: apiErr } = await apiRequest('/api/auth/send-reset-otp', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    setLoading(false);

    if (apiErr) {
      setError(apiErr);
    } else {
      setSuccessMessage(data?.message || 'Password reset code has been sent to your email.');
      setForgotState('RESET');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (!otp) {
      setError('Please enter the reset code');
      return;
    }
    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    const { data, error: apiErr } = await apiRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword })
    });
    setLoading(false);

    if (apiErr) {
      setError(apiErr);
    } else {
      setSuccessMessage(data?.message || 'Password reset successful!');
      setForgotState('NONE');
      setPassword('');
      setOtp('');
      setNewPassword('');
    }
  };

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (isSignup && !name) {
      setError('Please enter your name');
      return;
    }
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number');
      return;
    }

    setLoading(true);
    let result;
    if (isSignup) {
      result = await signup(name, email, password);
      if (result.success && result.verificationPending) {
        setLoading(false);
        setShowOtp(true);
        return;
      }
    } else {
      result = await login(email, password);
    }
    setLoading(false);

    if (result.success) {
      navigate('projects');
    } else {
      setError(result.message || 'Authentication failed');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp) {
      setError('Please enter the OTP');
      return;
    }
    setLoading(true);
    const result = await verifyOtp(email, otp);
    setLoading(false);
    if (result.success) {
      navigate('projects');
    } else {
      setError(result.message || 'OTP verification failed');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleLoading(true);
    setError('');
    const res = await loginWithGoogleToken(credentialResponse.credential, isSignup);
    setGoogleLoading(false);
    if (!res.success) {
      setError(res.message || 'Google Sign-In failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16" style={{ background: '#0a0a0f' }}>
      {/* Background glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-8"
        style={{ background: 'radial-gradient(ellipse, #7c3aed 0%, transparent 70%)', filter: 'blur(60px)' }} />

      <motion.div
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <button onClick={() => navigate('landing')} className="inline-flex items-center gap-2 group mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center group-hover:bg-purple-500 transition-colors">
              <Bug className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black text-white">Debug<span className="text-purple-400">It</span></span>
          </button>
          <h1 className="text-2xl font-bold text-white">
            {forgotState !== 'NONE' ? 'Reset Password' : (isSignup ? 'Create your account' : 'Welcome back')}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {forgotState === 'REQUEST' 
              ? 'Enter your email to receive a reset code' 
              : forgotState === 'RESET' 
              ? 'Enter your verification code and new password' 
              : (isSignup ? 'Start debugging real projects' : 'Continue your debugging journey')}
          </p>
        </div>

        <div className="p-8 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur">
          {showOtp ? (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-slate-300 mb-4 text-center">
                We've sent a 6-digit verification code to <span className="font-semibold text-purple-400">{email}</span>.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Verification Code (OTP)</label>
                <input
                  type="text"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:bg-white/[0.07] transition-all text-sm text-center tracking-widest font-mono text-lg"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors disabled:opacity-70 glow-purple mt-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                ) : (
                  'Verify Code'
                )}
              </button>
              
              <button
                type="button"
                onClick={() => { setShowOtp(false); setError(''); }}
                className="w-full text-center text-sm text-purple-400 hover:text-purple-300 font-medium mt-2"
              >
                Back to Sign Up
              </button>
            </form>
          ) : forgotState === 'REQUEST' ? (
            <form onSubmit={handleSendResetOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:bg-white/[0.07] transition-all text-sm"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors disabled:opacity-70 glow-purple mt-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                ) : (
                  'Send Reset Code'
                )}
              </button>
              
              <button
                type="button"
                onClick={() => { setForgotState('NONE'); setError(''); setSuccessMessage(''); }}
                className="w-full text-center text-sm text-purple-400 hover:text-purple-300 font-medium mt-2"
              >
                Back to Sign In
              </button>
            </form>
          ) : forgotState === 'RESET' ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {successMessage && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center">
                  {successMessage}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Reset Code (OTP)</label>
                <input
                  type="text"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  placeholder="Enter reset token"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:bg-white/[0.07] transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full px-4 py-2.5 pr-10 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:bg-white/[0.07] transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors disabled:opacity-70 glow-purple mt-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</>
                ) : (
                  'Reset Password'
                )}
              </button>
              
              <button
                type="button"
                onClick={() => { setForgotState('NONE'); setError(''); setSuccessMessage(''); }}
                className="w-full text-center text-sm text-purple-400 hover:text-purple-300 font-medium mt-2"
              >
                Back to Sign In
              </button>
            </form>
          ) : (
            <>
              {/* Google OAuth (Only when client ID is configured) */}
              {googleClientId && (
                <>
                  <div className="mb-6 flex justify-center w-full">
                    <div className="w-full flex justify-center">
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => setError('Google Authentication failed')}
                        theme="filled_blue"
                        shape="pill"
                        text="continue_with"
                        width="100%"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-slate-600 text-sm">or</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                </>
              )}

              {successMessage && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center mb-4">
                  {successMessage}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignup && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Alex Chen"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:bg-white/[0.07] transition-all text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:bg-white/[0.07] transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                      className="w-full px-4 py-2.5 pr-10 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:bg-white/[0.07] transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {!isSignup && (
                    <div className="flex justify-end mt-1.5">
                      <button
                        type="button"
                        onClick={() => { setForgotState('REQUEST'); setError(''); setSuccessMessage(''); }}
                        className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors disabled:opacity-70 glow-purple mt-2"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {isSignup ? 'Creating account...' : 'Signing in...'}</>
                  ) : (
                    isSignup ? 'Create Account' : 'Sign In'
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-6">
                {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  onClick={() => { navigate(isSignup ? 'login' : 'signup'); setError(''); }}
                  className="text-purple-400 hover:text-purple-300 font-medium"
                >
                  {isSignup ? 'Sign in' : 'Sign up free'}
                </button>
              </p>
            </>
          )}
        </div>

        {/* Demo hint */}
        <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
          <p className="text-xs text-blue-400">
            💡 {googleClientId ? 'Sign in with Google or use credentials.' : 'Demo Mode: Use any email + password (6+ chars) or click Google.'}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
