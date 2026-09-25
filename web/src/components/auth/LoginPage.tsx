import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/endpoints';
import {
  Layers,
  Mail,
  Lock,
  Phone,
  KeyRound,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [tab, setTab] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState('admin@kashvirainfotech.com');
  const [password, setPassword] = useState('Admin@123456');
  const [mobileNumber, setMobileNumber] = useState('+919999900000');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loginWithPassword, loginWithOtp } = useAuth();
  const navigate = useNavigate();

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginWithPassword(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error?.message ||
          'Failed to sign in. Please verify your credentials.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!mobileNumber) {
      setError('Please enter your registered mobile number');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await authApi.requestOtp({ mobileNumber });
      setOtpSent(true);
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error?.message ||
          'Could not request OTP. Verify mobile number with your administrator.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 4) {
      setError('Please enter the 6-digit OTP received');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await loginWithOtp(mobileNumber, otpCode);
      navigate('/dashboard');
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error?.message ||
          'Invalid or expired OTP code.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen bg-slate-50 dark:bg-slate-950">
      {/* Left Feature Showcase Banner (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-12 text-white relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/30">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight">KS-PMT</h1>
            <p className="text-xs text-blue-200">Kashvira Infotech Task & Product Management</p>
          </div>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-300 backdrop-blur-xs">
            <Sparkles className="h-3.5 w-3.5" /> Next-Gen Enterprise Solution
          </div>
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            Streamline projects, products, and multi-branch teams effortlessly.
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Dynamic task state machine, automated assignment matrix, client licensing, real-time AWS S3 cloud attachments, and granular RBAC overrides.
          </p>

          <div className="space-y-3 pt-2">
            {[
              'Multi-Branch Geofenced Access & Department Matrix',
              'Product Software Licensing, AMC & Milestones',
              'Dual Login: Enterprise Email or Mobile OTP',
              'Central Tamper-Evident Security Audit Logs',
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-400 border-t border-slate-800/80 pt-6">
          © {new Date().getFullYear()} Kashvira Infotech Pvt. Ltd. All rights reserved.
        </div>
      </div>

      {/* Right Login Card */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile Brand Icon */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-900 dark:text-white">KS-PMT</h2>
              <p className="text-xs text-slate-500">Enterprise Task Management</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:p-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Welcome to KS-PMT
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Sign in to your employee account to continue
            </p>

            {/* Dual Login Tabs */}
            <div className="mt-6 flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => {
                  setTab('password');
                  setError(null);
                }}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                  tab === 'password'
                    ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                Email & Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('otp');
                  setError(null);
                }}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                  tab === 'otp'
                    ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                Mobile & OTP
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Tab 1: Email & Password Form */}
            {tab === 'password' && (
              <form onSubmit={handlePasswordLogin} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Corporate Email
                  </label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@kashvirainfotech.com"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                  </div>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : 'Sign In with Password'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}

            {/* Tab 2: Mobile & OTP Form */}
            {tab === 'otp' && (
              <form onSubmit={handleOtpLogin} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Registered Mobile Number
                  </label>
                  <div className="relative mt-1 flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="tel"
                        required
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="+919999900000"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={loading || countdown > 0}
                      onClick={handleRequestOtp}
                      className="rounded-xl border border-blue-600 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-950/40 disabled:opacity-50 shrink-0"
                    >
                      {countdown > 0 ? `${countdown}s` : otpSent ? 'Resend' : 'Send OTP'}
                    </button>
                  </div>
                </div>

                {otpSent && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      6-Digit OTP Code
                    </label>
                    <div className="relative mt-1">
                      <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="123456"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-mono tracking-widest text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                      OTP has been dispatched to your mobile number.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !otpSent}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? 'Verifying OTP...' : 'Verify & Sign In'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}

            <div className="mt-6 text-center text-[11px] text-slate-400">
              Accounts are provisioned by your system administrator. Public registration is disabled.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
