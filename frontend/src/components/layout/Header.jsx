import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, LogOut, KeyRound, ChevronDown, Receipt, Sun, Moon, ArrowLeftRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import ChangePasswordModal from '../auth/ChangePasswordModal';

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const { config, clearWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const initial = user?.username?.[0]?.toUpperCase() ?? '?';

  function handleSwitch() {
    clearWorkspace();
    navigate('/workspace');
  }

  return (
    <>
      <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center px-3 sm:px-6 gap-2 sm:gap-4 shrink-0 z-10">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2 lg:hidden">
          <Receipt size={18} className="text-emerald-600" />
          <span className="text-base font-bold text-gray-900 dark:text-white">Expenses</span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          {/* Workspace indicator + switch */}
          {config && (
            <button
              onClick={handleSwitch}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-600 text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-xs font-medium"
              title="Switch workspace"
            >
              <span>{config.flag}</span>
              <span className="hidden sm:inline">{config.label}</span>
              <ArrowLeftRight size={12} />
            </button>
          )}

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
              <span className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0 select-none">
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
                    <span className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-bold shrink-0 select-none">
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

      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </>
  );
}
