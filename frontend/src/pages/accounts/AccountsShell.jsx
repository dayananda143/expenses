import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PiggyBank, CreditCard, Receipt, Sun, Moon, Menu, X, ArrowLeftRight, ChevronDown, KeyRound, LogOut, ShieldCheck, ShieldOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import ChangePasswordModal from '../../components/auth/ChangePasswordModal';
import TwoFactorModal from '../../components/auth/TwoFactorModal';

const NAV = [
  { to: '/accounts/dashboard',     label: 'Dashboard',     Icon: LayoutDashboard },
  { to: '/accounts/savings',       label: 'Savings',        Icon: PiggyBank },
  { to: '/accounts/credit-cards',  label: 'Credit Cards',   Icon: CreditCard },
  { to: '/accounts/payments',      label: 'Payments',       Icon: Receipt },
];

function NavItem({ to, label, Icon, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          isActive
            ? 'bg-violet-600 text-white shadow-sm shadow-violet-200 dark:shadow-violet-900/30'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
        }`
      }
    >
      <Icon size={16} />
      {label}
    </NavLink>
  );
}

export default function AccountsShell() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [show2FA, setShow2FA] = useState(false);

  const initial = user?.username?.[0]?.toUpperCase() ?? '?';

  if (!user?.accounts_access && !user?.is_admin) {
    navigate('/workspace', { replace: true });
    return null;
  }

  return (
    <>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`fixed lg:static inset-y-0 left-0 z-30 flex flex-col w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          {/* Logo */}
          <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100 dark:border-gray-800">
            <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center shrink-0">
              <CreditCard size={17} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Credit & Savings</p>
              <p className="text-[11px] text-gray-400 truncate">{user?.username}</p>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="ml-auto p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg lg:hidden"
            >
              <X size={16} />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {NAV.map((item) => (
              <NavItem key={item.to} {...item} onClick={() => setMobileOpen(false)} />
            ))}
          </nav>

        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top header — matches main Header style */}
          <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center px-3 sm:px-6 gap-2 sm:gap-4 shrink-0 z-10">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center gap-2 lg:hidden">
              <div className="w-5 h-5 bg-violet-600 rounded-md flex items-center justify-center">
                <CreditCard size={11} className="text-white" />
              </div>
              <span className="text-base font-bold text-gray-900 dark:text-white">Credit & Savings</span>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              {/* Workspace switcher button */}
              <button
                onClick={() => navigate('/workspace')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-600 text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors text-xs font-medium"
                title="Switch workspace"
              >
                <div className="w-4 h-4 bg-violet-600 rounded-sm flex items-center justify-center shrink-0">
                  <CreditCard size={9} className="text-white" />
                </div>
                <span className="hidden sm:inline">Credit & Savings</span>
                <ArrowLeftRight size={12} />
              </button>

              <button
                onClick={toggle}
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md transition-colors"
                title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <div className="relative pl-2 border-l border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowMenu((v) => !v)}
                  className="flex items-center gap-1.5 sm:gap-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0 select-none">
                    {initial}
                  </span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 hidden sm:block max-w-[80px] truncate">
                    {user?.username}
                  </span>
                  <ChevronDown size={13} className="text-gray-400 hidden sm:block" />
                </button>

                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl z-20 min-w-[192px] overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <span className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0 select-none">
                          {initial}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.username}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{user?.is_admin ? 'Administrator' : 'Member'}</p>
                        </div>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={() => { setShowChangePassword(true); setShowMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                          <KeyRound size={15} className="text-gray-400 shrink-0" />
                          Change password
                        </button>
                        <button
                          onClick={() => { setShow2FA(true); setShowMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                          {user?.totp_enabled
                            ? <ShieldOff size={15} className="text-red-400 shrink-0" />
                            : <ShieldCheck size={15} className="text-violet-500 shrink-0" />}
                          {user?.totp_enabled ? 'Disable 2FA' : 'Enable 2FA'}
                        </button>
                        <div className="mx-3 border-t border-gray-100 dark:border-gray-700 my-1" />
                        <button
                          onClick={() => { setShowMenu(false); logout(); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                        >
                          <LogOut size={15} className="text-red-500 shrink-0" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-7">
            <Outlet />
          </main>
        </div>
      </div>

      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
      {show2FA && <TwoFactorModal onClose={() => setShow2FA(false)} />}
    </>
  );
}
