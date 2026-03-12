import { useState, useEffect, useRef } from 'react';
import { X, ShieldCheck, ShieldOff, CheckCircle } from 'lucide-react';
import client from '../../api/client';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500';

export default function TwoFactorModal({ onClose }) {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const isEnabled = !!user?.totp_enabled;

  const [step, setStep] = useState(isEnabled ? 'disable' : 'setup'); // 'setup' | 'verify' | 'disable' | 'done'
  const [qr, setQr] = useState(null);
  const [secret, setSecret] = useState(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [doneMsg, setDoneMsg] = useState('');
  const codeRef = useRef(null);

  useEffect(() => {
    if (step === 'setup') {
      setLoading(true);
      client.get('/auth/2fa/setup')
        .then(({ secret: s, qr: q }) => { setSecret(s); setQr(q); })
        .catch((err) => setError(err?.error ?? 'Failed to load setup'))
        .finally(() => setLoading(false));
    }
  }, [step]);

  useEffect(() => {
    if (step === 'verify') codeRef.current?.focus();
  }, [step]);

  async function handleEnable() {
    if (code.replace(/\s/g, '').length !== 6) { setError('Enter the 6-digit code from your authenticator'); return; }
    setLoading(true); setError(null);
    try {
      await client.post('/auth/2fa/enable', { code });
      await refreshUser();
      setDoneMsg('2FA enabled successfully. Your account is now more secure.');
      setStep('done');
    } catch (err) {
      setError(err?.error ?? 'Failed to enable 2FA');
    } finally { setLoading(false); }
  }

  async function handleDisable() {
    if (!password) { setError('Enter your current password'); return; }
    if (code.replace(/\s/g, '').length !== 6) { setError('Enter the 6-digit code from your authenticator'); return; }
    setLoading(true); setError(null);
    try {
      await client.post('/auth/2fa/disable', { password, code });
      await refreshUser();
      setDoneMsg('2FA has been disabled.');
      setStep('done');
    } catch (err) {
      setError(err?.error ?? 'Failed to disable 2FA');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            {isEnabled ? <ShieldOff size={16} className="text-red-500" /> : <ShieldCheck size={16} className="text-emerald-500" />}
            {isEnabled ? 'Disable Two-Factor Authentication' : 'Enable Two-Factor Authentication'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Done state */}
          {step === 'done' && (
            <div className="text-center py-4">
              <CheckCircle size={40} className="mx-auto text-emerald-500 mb-3" />
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{doneMsg}</p>
              <button onClick={onClose} className="mt-4 px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
                Close
              </button>
            </div>
          )}

          {/* Setup: show QR */}
          {step === 'setup' && (
            <>
              {loading && <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Loading setup...</p>}
              {!loading && qr && (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Scan this QR code with <strong>Google Authenticator</strong>, <strong>Authy</strong>, or any TOTP app.
                  </p>
                  <div className="flex justify-center">
                    <img src={qr} alt="2FA QR code" className="w-48 h-48 rounded-lg border border-gray-200 dark:border-gray-700" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Or enter the key manually:</p>
                    <code className="block text-xs bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 break-all font-mono">
                      {secret}
                    </code>
                  </div>
                  <button
                    onClick={() => { setCode(''); setError(null); setStep('verify'); }}
                    className="w-full bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700 transition-colors"
                  >
                    I've scanned the code →
                  </button>
                </>
              )}
            </>
          )}

          {/* Verify: enter 6-digit code to enable */}
          {step === 'verify' && (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enter the 6-digit code from your authenticator app to confirm setup.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Authenticator Code</label>
                <input
                  ref={codeRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && handleEnable()}
                  className={`${inputCls} text-center text-lg tracking-[0.5em] font-mono`}
                  placeholder="000000"
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-3">
                <button onClick={() => { setStep('setup'); setError(null); }} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Back
                </button>
                <button onClick={handleEnable} disabled={loading} className="flex-1 bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                  {loading ? 'Verifying...' : 'Enable 2FA'}
                </button>
              </div>
            </>
          )}

          {/* Disable: enter password + TOTP */}
          {step === 'disable' && (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                To disable 2FA, confirm your password and enter your current authenticator code.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                  placeholder="Your password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Authenticator Code</label>
                <input
                  ref={codeRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && handleDisable()}
                  className={`${inputCls} text-center text-lg tracking-[0.5em] font-mono`}
                  placeholder="000000"
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Cancel
                </button>
                <button onClick={handleDisable} disabled={loading} className="flex-1 bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
                  {loading ? 'Disabling...' : 'Disable 2FA'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
