import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { LayoutDashboard, Receipt, Tag, Target, Users, HeartPulse, Wallet, X, PiggyBank, ShieldCheck, Lightbulb } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';

const allLinks = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, indiaHide: false },
  { to: '/expenses',  label: 'Expenses',  Icon: Receipt,         indiaHide: false },
];

const adminLinks = [
  { to: '/users',      label: 'Users',      Icon: Users  },
  { to: '/categories', label: 'Categories', Icon: Tag,    indiaHide: true },
  { to: '/budgets',    label: 'Budgets',    Icon: Target, indiaHide: true },
];

export default function Sidebar({ onClose }) {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const isAdmin = !!user?.is_admin;
  const links = allLinks.filter(l => !(l.indiaHide && workspace === 'india'));
  const visibleAdminLinks = adminLinks.filter(l => !(l.indiaHide && workspace === 'india'));
  const showHospital = user?.is_admin || user?.hospital_access;

  const linkClass = ({ isActive }) =>
    clsx(
      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
      isActive
        ? 'bg-emerald-600 text-white'
        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
    );

  return (
    <aside className="w-56 h-full shrink-0 bg-gray-900 text-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 lg:hidden border-b border-gray-700">
        <span className="text-sm font-bold text-white">Expenses</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
          <X size={18} />
        </button>
      </div>

      <div className="px-4 py-5 hidden lg:block border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Receipt size={16} className="text-white" />
          </span>
          <span className="text-sm font-bold text-white">Expenses</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} end={to === '/dashboard'} className={linkClass} onClick={onClose}>
            <Icon size={16} />
            {label}
          </NavLink>
        ))}

        {workspace === 'india' && (
          <NavLink to="/savings" className={linkClass} onClick={onClose}>
            <PiggyBank size={16} />
            Savings
          </NavLink>
        )}

        {workspace === 'india' && (
          <NavLink to="/lic" className={linkClass} onClick={onClose}>
            <ShieldCheck size={16} />
            LIC
          </NavLink>
        )}

        {workspace !== 'india' && (
          <NavLink to="/insights" className={linkClass} onClick={onClose}>
            <Lightbulb size={16} />
            Insights
          </NavLink>
        )}

        {showHospital && workspace !== 'india' && (
          <NavLink to="/hospital" className={linkClass} onClick={onClose}>
            <HeartPulse size={16} />
            Hospital
          </NavLink>
        )}

        {workspace !== 'india' && (
          <NavLink to="/salary" className={linkClass} onClick={onClose}>
            <Wallet size={16} />
            Salary
          </NavLink>
        )}

        {isAdmin && (
          <>
            <div className="pt-2 pb-1 px-3">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Admin</span>
            </div>
            {visibleAdminLinks.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} className={linkClass} onClick={onClose}>
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
