import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors';

function IllustrationPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-10 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3" />
      <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />

      {/* Logo */}
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" strokeLinecap="round" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 12h6M9 16h4" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Expenses</span>
        </div>
      </div>

      {/* Main illustration */}
      <div className="relative z-10 flex-1 flex items-center justify-center py-10">
        <svg viewBox="0 0 320 280" fill="none" className="w-full max-w-xs drop-shadow-2xl">
          {/* Main card */}
          <rect x="20" y="30" width="280" height="170" rx="16" fill="white" fillOpacity="0.12" />
          <rect x="20" y="30" width="280" height="170" rx="16" stroke="white" strokeOpacity="0.2" strokeWidth="1" />

          {/* Card header */}
          <rect x="20" y="30" width="280" height="52" rx="16" fill="white" fillOpacity="0.08" />
          <rect x="20" y="66" width="280" height="16" fill="white" fillOpacity="0.08" />

          {/* Header text */}
          <rect x="40" y="46" width="80" height="8" rx="4" fill="white" fillOpacity="0.5" />
          <rect x="220" y="44" width="60" height="12" rx="4" fill="white" fillOpacity="0.3" />

          {/* Chart bars */}
          <rect x="50" y="110" width="28" height="60" rx="6" fill="white" fillOpacity="0.15" />
          <rect x="50" y="128" width="28" height="42" rx="6" fill="#34d399" fillOpacity="0.8" />

          <rect x="94" y="100" width="28" height="70" rx="6" fill="white" fillOpacity="0.15" />
          <rect x="94" y="110" width="28" height="60" rx="6" fill="#34d399" fillOpacity="0.6" />

          <rect x="138" y="120" width="28" height="50" rx="6" fill="white" fillOpacity="0.15" />
          <rect x="138" y="138" width="28" height="32" rx="6" fill="#34d399" fillOpacity="0.9" />

          <rect x="182" y="105" width="28" height="65" rx="6" fill="white" fillOpacity="0.15" />
          <rect x="182" y="113" width="28" height="57" rx="6" fill="#34d399" />

          <rect x="226" y="115" width="28" height="55" rx="6" fill="white" fillOpacity="0.15" />
          <rect x="226" y="125" width="28" height="45" rx="6" fill="#34d399" fillOpacity="0.7" />

          {/* Bottom line */}
          <line x1="40" y1="173" x2="280" y2="173" stroke="white" strokeOpacity="0.15" strokeWidth="1" />

          {/* Stat cards row */}
          <rect x="20" y="216" width="84" height="48" rx="12" fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
          <rect x="118" y="216" width="84" height="48" rx="12" fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
          <rect x="216" y="216" width="84" height="48" rx="12" fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.15" strokeWidth="1" />

          {/* Stat labels */}
          <rect x="32" y="226" width="40" height="6" rx="3" fill="white" fillOpacity="0.35" />
          <rect x="32" y="240" width="56" height="10" rx="4" fill="white" fillOpacity="0.7" />

          <rect x="130" y="226" width="40" height="6" rx="3" fill="white" fillOpacity="0.35" />
          <rect x="130" y="240" width="48" height="10" rx="4" fill="#34d399" fillOpacity="0.9" />

          <rect x="228" y="226" width="40" height="6" rx="3" fill="white" fillOpacity="0.35" />
          <rect x="228" y="240" width="52" height="10" rx="4" fill="white" fillOpacity="0.7" />
        </svg>
      </div>

      {/* Tagline */}
      <div className="relative z-10 space-y-3">
        <h2 className="text-white text-2xl font-bold leading-tight">
          Track every rupee,<br />every dollar.
        </h2>
        <p className="text-emerald-100/70 text-sm leading-relaxed">
          Manage your expenses, budgets, and accounts in one place. Simple, fast, and private.
        </p>
        <div className="flex items-center gap-3 pt-2">
          {['Expenses', 'Budgets', 'Accounts'].map((f) => (
            <span key={f} className="text-xs bg-white/15 text-white px-3 py-1 rounded-full font-medium backdrop-blur-sm">
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { login, loginWith2fa } = useAuth();
  const navigate  = useNavigate();
  const [error, setError] = useState(null);
  const [showPwd, setShowPwd] = useState(false);
  const [step, setStep] = useState('credentials'); // 'credentials' | '2fa'
  const [tempToken, setTempToken] = useState(null);
  const [tfaCode, setTfaCode] = useState('');
  const [tfaLoading, setTfaLoading] = useState(false);
  const codeRef = useRef(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  async function onSubmit({ username, password }) {
    try {
      setError(null);
      await login(username, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err?.require_2fa) {
        setTempToken(err.temp_token);
        setStep('2fa');
        setTfaCode('');
        setTimeout(() => codeRef.current?.focus(), 50);
      } else {
        setError(err?.error ?? 'Login failed');
      }
    }
  }

  async function onSubmit2fa(e) {
    e.preventDefault();
    if (tfaCode.length !== 6) { setError('Enter the 6-digit code from your authenticator'); return; }
    setTfaLoading(true);
    setError(null);
    try {
      await loginWith2fa(tempToken, tfaCode);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err?.error ?? 'Invalid code');
    } finally {
      setTfaLoading(false);
    }
  }

  const errorBanner = error && (
    <div className="flex items-start gap-2.5 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
      <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      {error}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 lg:grid lg:grid-cols-2">
      <IllustrationPanel />

      {/* Right: login form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" strokeLinecap="round" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <path d="M9 12h6M9 16h4" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-gray-900 dark:text-white font-bold text-xl">Expenses</span>
          </div>

          {step === 'credentials' ? (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sign in to your account to continue</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Username</label>
                  <input
                    {...register('username', { required: 'Username is required' })}
                    type="text"
                    autoComplete="username"
                    placeholder="Enter your username"
                    className={inputCls}
                  />
                  {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      {...register('password', { required: 'Password is required' })}
                      type={showPwd ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className={`${inputCls} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
                </div>

                {errorBanner}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-600 text-white rounded-xl px-4 py-3 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm shadow-emerald-500/20 mt-2"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Signing in...
                    </span>
                  ) : 'Sign in'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-8">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-4">
                  <ShieldCheck size={22} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Two-factor authentication</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter the 6-digit code from your authenticator app.</p>
              </div>

              <form onSubmit={onSubmit2fa} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Authenticator Code</label>
                  <input
                    ref={codeRef}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={tfaCode}
                    onChange={(e) => { setTfaCode(e.target.value.replace(/\D/g, '')); setError(null); }}
                    placeholder="000000"
                    className={`${inputCls} text-center text-xl tracking-[0.5em] font-mono`}
                  />
                </div>

                {errorBanner}

                <button
                  type="submit"
                  disabled={tfaLoading}
                  className="w-full bg-emerald-600 text-white rounded-xl px-4 py-3 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm shadow-emerald-500/20"
                >
                  {tfaLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Verifying...
                    </span>
                  ) : 'Verify'}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('credentials'); setError(null); setTempToken(null); }}
                  className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors py-1"
                >
                  ← Back to login
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
