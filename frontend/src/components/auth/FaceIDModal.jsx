import { useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { X } from 'lucide-react';

function getToken() { return localStorage.getItem('expenses_token') || ''; }

function FaceIdIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4H8a4 4 0 00-4 4v6" />
      <path d="M34 4h6a4 4 0 014 4v6" />
      <path d="M14 44H8a4 4 0 01-4-4v-6" />
      <path d="M34 44h6a4 4 0 004-4v-6" />
      <circle cx="17" cy="21" r="2" fill="currentColor" stroke="none" />
      <circle cx="31" cy="21" r="2" fill="currentColor" stroke="none" />
      <path d="M24 22v5" />
      <path d="M17 33c1.8 2.5 5.2 4 7 4s5.2-1.5 7-4" />
    </svg>
  );
}

export default function FaceIDModal({ onClose }) {
  const [phase, setPhase] = useState('idle'); // idle | enrolling | removing | done
  const [error, setError] = useState('');
  const [hasCredential, setHasCredential] = useState(null);

  // Check current state on mount
  useState(() => {
    fetch('/api/auth/webauthn/registered', {
      headers: { Authorization: `Bearer ${getToken()}` },
    }).then(r => r.json()).then(d => setHasCredential(d.registered)).catch(() => setHasCredential(false));
  });

  const webAuthnSupported = typeof window !== 'undefined' && !!window.PublicKeyCredential;

  async function enroll() {
    setError('');
    setPhase('enrolling');
    try {
      const optRes = await fetch('/api/auth/webauthn/register/options', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!optRes.ok) throw new Error('Could not start Face ID setup');
      const options = await optRes.json();

      const regResp = await startRegistration(options);

      const verRes = await fetch('/api/auth/webauthn/register/verify', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(regResp),
      });
      const data = await verRes.json();
      if (!verRes.ok) throw new Error(data.error || 'Setup failed');

      setHasCredential(true);
      setPhase('done');
    } catch (err) {
      if (err.name === 'NotAllowedError') setError('Face ID was cancelled or not available');
      else setError(err.message || 'Setup failed');
      setPhase('idle');
    }
  }

  async function remove() {
    setError('');
    setPhase('removing');
    try {
      await fetch('/api/auth/webauthn/credential', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setHasCredential(false);
      setPhase('idle');
    } catch {
      setError('Failed to remove credential');
      setPhase('idle');
    }
  }

  if (!webAuthnSupported) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
        <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-sm p-6 text-center space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Face ID is not supported on this device or browser.</p>
          <button onClick={onClose} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <FaceIdIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Face ID</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {phase === 'done' ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <FaceIdIcon className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Face ID enabled!</p>
              <p className="text-xs text-gray-400">You can now sign in with Face ID next time.</p>
            </div>
          ) : hasCredential === null ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : hasCredential ? (
            <>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                <FaceIdIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Face ID is active</p>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Sign in with a glance on your iPhone</p>
                </div>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                onClick={remove}
                disabled={phase === 'removing'}
                className="w-full border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-xl py-2.5 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
              >
                {phase === 'removing' ? 'Removing…' : 'Disable Face ID'}
              </button>
            </>
          ) : (
            <>
              <div className="text-center py-2">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <FaceIdIcon className="w-9 h-9 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Enable Face ID</p>
                <p className="text-xs text-gray-400 leading-relaxed">Sign in instantly next time using Face ID instead of your password.</p>
              </div>
              {error && <p className="text-xs text-red-500 text-center">{error}</p>}
              <button
                onClick={enroll}
                disabled={phase === 'enrolling'}
                className="w-full bg-emerald-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <FaceIdIcon className="w-5 h-5" />
                {phase === 'enrolling' ? 'Setting up…' : 'Enable Face ID'}
              </button>
            </>
          )}

          {phase !== 'done' && (
            <button onClick={onClose} className="w-full text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-1 transition-colors">
              {phase === 'done' || hasCredential ? 'Close' : 'Not now'}
            </button>
          )}
          {phase === 'done' && (
            <button onClick={onClose} className="w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl py-2.5 text-sm font-semibold transition-colors">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
