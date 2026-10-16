import React, { useState, useEffect } from 'react';
import {
  Shield,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  KeyRound,
  User,
  ChevronDown,
  Sparkles,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { useSafety } from '../../context/SafetyContext';
import {
  signInWithEmail,
  signUpWithEmail,
  sendPhoneOtp,
  verifyPhoneOtp,
  sendPasswordResetEmail,
  isSupabaseConfigured,
  getCleanSupabaseUrl,
} from '../../lib/supabase';
import { soundManager } from '../../utils/audio';

interface CountryCode {
  code: string;
  dial: string;
  name: string;
  flag: string;
}

const COUNTRY_CODES: CountryCode[] = [
  { code: 'IN', dial: '+91', name: 'India', flag: '🇮🇳' },
  { code: 'US', dial: '+1', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', dial: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', dial: '+1', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', dial: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: 'AE', dial: '+971', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'SG', dial: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: 'DE', dial: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', dial: '+33', name: 'France', flag: '🇫🇷' },
];

interface AuthScreenProps {
  onSuccess?: () => void;
  onSkip?: () => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onSuccess,
  onSkip,
  initialMode = 'signin',
}) => {
  const { showToast, theme, deviceView } = useSafety();

  // Mode: 'email' or 'phone'
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [isSignUp, setIsSignUp] = useState<boolean>(initialMode === 'signup');

  // Email form state
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isForgotPassword, setIsForgotPassword] = useState<boolean>(false);

  // Phone OTP form state
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  // UI status
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Clean full phone number in E.164 format
  const getFullPhoneE164 = (): string => {
    const rawDigits = phoneNumber.replace(/\D/g, '');
    const cleanDigits = rawDigits.startsWith('0') ? rawDigits.slice(1) : rawDigits;
    return `${selectedCountry.dial}${cleanDigits}`;
  };

  // 1. Handle Email / Password Login & Sign Up
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    soundManager.triggerHaptic(20);

    try {
      if (isSignUp) {
        const { user, session, error, requiresEmailConfirmation } = await signUpWithEmail(
          cleanEmail,
          password,
          { name: name.trim() || cleanEmail.split('@')[0] }
        );

        if (error) {
          setErrorMessage(error.message || 'Failed to create account.');
          setLoading(false);
          return;
        }

        if (requiresEmailConfirmation) {
          setInfoMessage(
            'Account created! A confirmation link has been sent to your email. Please verify your email before signing in.'
          );
          setIsSignUp(false);
        } else if (session || user) {
          showToast(`Welcome to SafeJourney, ${name.trim() || 'Traveler'}!`);
          if (onSuccess) onSuccess();
        }
      } else {
        const { user, session, error } = await signInWithEmail(cleanEmail, password);
        if (error) {
          if (error.message.toLowerCase().includes('email not confirmed')) {
            setErrorMessage(
              'Your email has not been confirmed yet. Please click the verification link in your inbox, or request a password reset.'
            );
          } else {
            setErrorMessage(error.message || 'Invalid email or password.');
          }
          setLoading(false);
          return;
        }

        if (session || user) {
          showToast('Signed in successfully!');
          if (onSuccess) onSuccess();
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter your account email to receive reset instructions.');
      return;
    }

    setLoading(true);
    try {
      const res = await sendPasswordResetEmail(cleanEmail);
      if (res.success) {
        setInfoMessage(res.message);
        setIsForgotPassword(false);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Send Phone OTP
  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const rawDigits = phoneNumber.replace(/\D/g, '');
    if (rawDigits.length < 8) {
      setErrorMessage('Please enter a valid mobile number with at least 8 digits.');
      return;
    }

    const fullPhone = getFullPhoneE164();
    setLoading(true);
    soundManager.triggerHaptic(20);

    try {
      const res = await sendPhoneOtp(fullPhone);
      if (res.success) {
        setOtpSent(true);
        setCooldownSeconds(60);
        setInfoMessage(res.message);
      } else {
        // Helpful diagnostic message for user if SMS provider isn't enabled in Supabase yet
        if (res.error?.message?.toLowerCase().includes('sms provider') || res.error?.message?.toLowerCase().includes('not enabled')) {
          setErrorMessage(
            `Supabase SMS Provider Not Enabled: In your Supabase dashboard, go to Authentication > Providers > Phone, and configure Twilio or MessageBird to send real SMS.`
          );
        } else {
          setErrorMessage(res.message);
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to dispatch verification code.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Verify Phone OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const cleanOtp = otpCode.replace(/\D/g, '').trim();
    if (cleanOtp.length < 6) {
      setErrorMessage('Please enter the full 6-digit OTP code.');
      return;
    }

    const fullPhone = getFullPhoneE164();
    setLoading(true);
    soundManager.triggerHaptic(20);

    try {
      const { user, session, error } = await verifyPhoneOtp(fullPhone, cleanOtp);
      if (error) {
        setErrorMessage(error.message || 'Invalid or expired OTP code. Please retry.');
        setLoading(false);
        return;
      }

      if (session || user) {
        showToast('Mobile verified & logged in!');
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className="w-full max-w-md mx-auto py-6 px-4 sm:px-0 animate-fadeIn select-none">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-950 text-white shadow-xl shadow-indigo-600/30 border border-indigo-400/40 mb-3 animate-float">
          <Shield className="w-7 h-7 fill-indigo-400/20 stroke-[2.4]" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          SafeJourney Guard
        </h1>
        <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1">
          {isForgotPassword
            ? 'Reset your account security access'
            : isSignUp
            ? 'Create your protected safety identity'
            : 'Sign in to sync journeys & encrypted evidence'}
        </p>
      </div>

      {/* Main Glass Panel */}
      <div className="glass-panel-elevated rounded-[36px] p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-indigo-900/50 relative overflow-hidden">
        {/* Supabase Connection Pill */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-indigo-900/40">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isSupabaseConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">
              {isSupabaseConfigured ? 'Supabase Auth Online' : 'Local Sandbox Mode'}
            </span>
          </div>
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Continue Offline →
            </button>
          )}
        </div>

        {/* Auth Method Tabs (Email vs Phone OTP) */}
        {!isForgotPassword && (
          <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 mb-6 border border-slate-200 dark:border-indigo-950">
            <button
              type="button"
              onClick={() => {
                setAuthMethod('email');
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                authMethod === 'email'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-700 dark:text-slate-300 hover:text-indigo-600'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email & Password</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMethod('phone');
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                authMethod === 'phone'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-700 dark:text-slate-300 hover:text-indigo-600'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Phone SMS OTP</span>
            </button>
          </div>
        )}

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span className="leading-relaxed font-bold">{errorMessage}</span>
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span className="leading-relaxed font-bold">{infoMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: EMAIL & PASSWORD FLOW */}
        {/* ========================================================================= */}
        {authMethod === 'email' && !isForgotPassword && (
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Aanya Sharma"
                    required={isSignUp}
                    className="w-full h-11 pl-10 pr-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-900/50 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-inner"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoComplete="email"
                  className="w-full h-11 pl-10 pr-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-900/50 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-inner"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Password
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setErrorMessage(null);
                      setInfoMessage(null);
                    }}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  className="w-full h-11 pl-10 pr-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-900/50 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 rounded-2xl bg-indigo-600 text-white text-xs font-black tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-98 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{isSignUp ? 'Create SafeJourney Account' : 'Sign In with Email'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Toggle Sign In / Sign Up */}
            <div className="text-center pt-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
                className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                {isSignUp ? 'Sign In' : 'Sign Up Free'}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: FORGOT PASSWORD FLOW */}
        {/* ========================================================================= */}
        {isForgotPassword && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Account Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full h-11 pl-10 pr-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-900/50 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-inner"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-indigo-600 text-white text-xs font-black tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-98 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Send Reset Instructions</span>}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setErrorMessage(null);
              }}
              className="w-full text-xs font-black text-slate-600 dark:text-slate-400 hover:underline text-center cursor-pointer"
            >
              ← Back to Sign In
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: PHONE SMS OTP FLOW */}
        {/* ========================================================================= */}
        {authMethod === 'phone' && (
          <div className="space-y-4">
            {!otpSent ? (
              // Step 3A: Enter Phone Number
              <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Country & Mobile Number
                  </label>

                  <div className="flex gap-2">
                    {/* Country Code Dropdown */}
                    <div className="relative shrink-0">
                      <select
                        value={selectedCountry.code}
                        onChange={(e) => {
                          const c = COUNTRY_CODES.find((x) => x.code === e.target.value);
                          if (c) setSelectedCountry(c);
                        }}
                        className="h-11 pl-3 pr-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-900/50 text-xs font-black text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-inner appearance-none cursor-pointer"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.dial}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Number Input */}
                    <div className="relative flex-1">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="98765 43210"
                        required
                        className="w-full h-11 pl-10 pr-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-900/50 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-inner"
                      />
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1 block">
                    Full international format: {getFullPhoneE164()}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 mt-2 rounded-2xl bg-indigo-600 text-white text-xs font-black tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-98 transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Send 6-Digit OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              // Step 3B: Verify 6-digit OTP
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-bold text-slate-600 dark:text-slate-400 block">Sent OTP to</span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400 font-mono">
                      {getFullPhoneE164()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode('');
                      setErrorMessage(null);
                    }}
                    className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Edit Phone
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Enter 6-Digit Verification Code
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      required
                      autoFocus
                      className="w-full h-12 pl-10 pr-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-900/50 text-base font-black tracking-widest text-center text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-inner font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length < 6}
                  className="w-full h-12 rounded-2xl bg-indigo-600 text-white text-xs font-black tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-98 transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Verify & Enter SafeJourney</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Resend Cooldown */}
                <div className="text-center pt-1">
                  {cooldownSeconds > 0 ? (
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      Resend code in {cooldownSeconds}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendPhoneOtp}
                      disabled={loading}
                      className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Resend SMS OTP
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Security Privacy Notice */}
      <div className="text-center mt-5">
        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-indigo-500" />
          <span>AES-256 encrypted transit corridors • RLS protected profile data</span>
        </p>
      </div>
    </div>
  );
};
