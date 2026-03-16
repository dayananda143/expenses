import { useNavigate } from 'react-router-dom';
import { Sun, Moon, CreditCard, LogOut, TrendingUp, PiggyBank, ArrowRight, Landmark } from 'lucide-react';
import { US, IN } from 'country-flag-icons/react/3x2';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useTheme } from '../contexts/ThemeContext';

const FLAG_COMPONENTS = { us: US, india: IN };

function WorkspaceIllustration() {
  return (
    <svg viewBox="0 0 400 220" fill="none" className="w-full max-w-md opacity-90">
      {/* Background card */}
      <rect x="10" y="10" width="380" height="200" rx="20" fill="white" fillOpacity="0.07" stroke="white" strokeOpacity="0.12" strokeWidth="1" />

      {/* Left mini card — savings */}
      <rect x="28" y="30" width="110" height="80" rx="12" fill="white" fillOpacity="0.1" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
      <circle cx="48" cy="52" r="12" fill="#34d399" fillOpacity="0.25" />
      <path d="M42 52c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="36" y="68" width="50" height="6" rx="3" fill="white" fillOpacity="0.35" />
      <rect x="36" y="80" width="72" height="10" rx="4" fill="#34d399" fillOpacity="0.85" />
      <rect x="36" y="96" width="40" height="5" rx="2.5" fill="white" fillOpacity="0.2" />

      {/* Middle big card — main */}
      <rect x="148" y="20" width="144" height="100" rx="14" fill="white" fillOpacity="0.13" stroke="white" strokeOpacity="0.25" strokeWidth="1" />
      <rect x="148" y="20" width="144" height="38" rx="14" fill="white" fillOpacity="0.08" />
      <rect x="148" y="44" width="144" height="14" fill="white" fillOpacity="0.06" />
      <rect x="162" y="30" width="52" height="7" rx="3.5" fill="white" fillOpacity="0.4" />
      <rect x="162" y="60" width="36" height="6" rx="3" fill="white" fillOpacity="0.3" />
      <rect x="162" y="72" width="96" height="14" rx="5" fill="white" fillOpacity="0.7" />
      {/* Mini chart inside */}
      <rect x="162" y="94" width="14" height="18" rx="3" fill="#34d399" fillOpacity="0.6" />
      <rect x="180" y="88" width="14" height="24" rx="3" fill="#34d399" fillOpacity="0.8" />
      <rect x="198" y="96" width="14" height="16" rx="3" fill="#34d399" fillOpacity="0.5" />
      <rect x="216" y="84" width="14" height="28" rx="3" fill="#34d399" />
      <rect x="234" y="90" width="14" height="22" rx="3" fill="#34d399" fillOpacity="0.7" />

      {/* Right mini card — credit */}
      <rect x="302" y="30" width="78" height="80" rx="12" fill="white" fillOpacity="0.1" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
      <rect x="314" y="44" width="54" height="28" rx="6" fill="white" fillOpacity="0.15" stroke="white" strokeOpacity="0.3" strokeWidth="0.5" />
      <rect x="314" y="44" width="54" height="10" rx="6" fill="white" fillOpacity="0.12" />
      <rect x="316" y="47" width="20" height="4" rx="2" fill="white" fillOpacity="0.5" />
      <circle cx="356" cy="48" r="4" fill="white" fillOpacity="0.2" />
      <circle cx="360" cy="48" r="4" fill="white" fillOpacity="0.15" />
      <rect x="314" y="80" width="54" height="5" rx="2.5" fill="white" fillOpacity="0.25" />
      <rect x="314" y="90" width="38" height="8" rx="3" fill="white" fillOpacity="0.5" />

      {/* Bottom row stat pills */}
      <rect x="28" y="126" width="90" height="36" rx="10" fill="white" fillOpacity="0.1" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
      <rect x="36" y="134" width="36" height="5" rx="2.5" fill="white" fillOpacity="0.3" />
      <rect x="36" y="144" width="60" height="9" rx="3.5" fill="#34d399" fillOpacity="0.8" />

      <rect x="130" y="126" width="90" height="36" rx="10" fill="white" fillOpacity="0.1" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
      <rect x="138" y="134" width="36" height="5" rx="2.5" fill="white" fillOpacity="0.3" />
      <rect x="138" y="144" width="52" height="9" rx="3.5" fill="white" fillOpacity="0.6" />

      <rect x="232" y="126" width="90" height="36" rx="10" fill="white" fillOpacity="0.1" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
      <rect x="240" y="134" width="36" height="5" rx="2.5" fill="white" fillOpacity="0.3" />
      <rect x="240" y="144" width="60" height="9" rx="3.5" fill="white" fillOpacity="0.6" />

      <rect x="334" y="126" width="58" height="36" rx="10" fill="white" fillOpacity="0.1" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
      <rect x="342" y="134" width="30" height="5" rx="2.5" fill="white" fillOpacity="0.3" />
      <rect x="342" y="144" width="40" height="9" rx="3.5" fill="white" fillOpacity="0.5" />

      {/* Floating dots decoration */}
      <circle cx="50" cy="180" r="3" fill="white" fillOpacity="0.15" />
      <circle cx="65" cy="175" r="2" fill="white" fillOpacity="0.1" />
      <circle cx="360" cy="175" r="3" fill="#34d399" fillOpacity="0.2" />
      <circle cx="375" cy="182" r="2" fill="#34d399" fillOpacity="0.15" />
    </svg>
  );
}

const TILE_STYLES = {
  india: {
    gradient: 'from-orange-500 to-amber-600',
    glow: 'shadow-orange-200 dark:shadow-orange-900/30',
    border: 'hover:border-orange-400 dark:hover:border-orange-500',
    badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  },
  us: {
    gradient: 'from-blue-500 to-indigo-600',
    glow: 'shadow-blue-200 dark:shadow-blue-900/30',
    border: 'hover:border-blue-400 dark:hover:border-blue-500',
    badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  },
  accounts: {
    gradient: 'from-violet-500 to-purple-600',
    glow: 'shadow-violet-200 dark:shadow-violet-900/30',
    border: 'hover:border-violet-400 dark:hover:border-violet-500',
    badge: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
  },
};

export default function WorkspacePage() {
  const { user, logout } = useAuth();
  const { WORKSPACE_CONFIG, selectWorkspace } = useWorkspace();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();

  const allowed = user?.is_admin ? ['india', 'us'] : (user?.workspaces ?? []);

  function enterWorkspace(ws) {
    selectWorkspace(ws);
    navigate('/dashboard', { replace: true });
  }

  const tiles = [
    ...allowed.map(ws => ({
      key: ws,
      FlagComp: FLAG_COMPONENTS[ws] ?? null,
      label: WORKSPACE_CONFIG[ws].label,
      sub: WORKSPACE_CONFIG[ws].currency,
      Icon: TrendingUp,
      onClick: () => enterWorkspace(ws),
      style: TILE_STYLES[ws] ?? TILE_STYLES.us,
    })),
    ...(user?.accounts_access ? [{
      key: 'accounts',
      FlagComp: null,
      label: 'Credit & Savings',
      sub: 'Manage accounts',
      Icon: Landmark,
      onClick: () => navigate('/accounts'),
      style: TILE_STYLES.accounts,
    }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col lg:flex-row">

      {/* Left decorative panel */}
      <div className="lg:w-1/2 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 flex flex-col justify-between p-8 lg:p-12 relative overflow-hidden min-h-[220px] lg:min-h-screen">
        {/* Blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3" />
        <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" strokeLinecap="round" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 12h6M9 16h4" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Expenses</span>
        </div>

        {/* Illustration — hidden on small screens */}
        <div className="relative z-10 hidden lg:flex items-center justify-center flex-1 py-8">
          <WorkspaceIllustration />
        </div>

        {/* Tagline */}
        <div className="relative z-10 hidden lg:block space-y-3">
          <h2 className="text-white text-2xl font-bold leading-tight">Your finances,<br />one place.</h2>
          <p className="text-emerald-100/70 text-sm leading-relaxed max-w-xs">
            Switch between workspaces and accounts seamlessly. Everything is just a click away.
          </p>
          <div className="flex items-center gap-2 pt-1">
            {[{ icon: TrendingUp, label: 'Expenses' }, { icon: PiggyBank, label: 'Savings' }, { icon: CreditCard, label: 'Credit' }].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1 text-xs bg-white/15 text-white px-2.5 py-1 rounded-full font-medium backdrop-blur-sm">
                <Icon size={11} /> {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="lg:w-1/2 flex flex-col justify-center p-8 lg:p-12 relative">
        {/* Top-right controls */}
        <div className="absolute top-4 right-4 flex items-center gap-1">
          <button
            onClick={toggle}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>

        <div className="max-w-sm w-full mx-auto">
          {/* Greeting */}
          <div className="mb-8">
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">Welcome back 👋</p>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white capitalize">{user?.username}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">Where would you like to go today?</p>
          </div>

          {allowed.length === 0 ? (
            <div className="text-center text-gray-400 dark:text-gray-500 py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
              <p className="text-sm font-medium">No workspace access</p>
              <p className="text-xs mt-1">Contact your administrator.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tiles.map(({ key, FlagComp, label, sub, Icon, onClick, style }) => (
                <button
                  key={key}
                  onClick={onClick}
                  className={`group w-full flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-100 dark:border-gray-800 ${style.border} shadow-sm hover:shadow-md ${style.glow} transition-all duration-200 text-left`}
                >
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${style.gradient} flex items-center justify-center shrink-0 shadow-sm overflow-hidden`}>
                    {FlagComp
                      ? <FlagComp className="w-10 h-auto" />
                      : <Icon size={22} className="text-white" />
                    }
                  </div>

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{label}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
                  </div>

                  {/* Arrow */}
                  <ArrowRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          )}

          <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-8">
            Logged in as <span className="font-medium">{user?.username}</span>
            {user?.is_admin && <span className="ml-1 text-purple-500">· Admin</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
