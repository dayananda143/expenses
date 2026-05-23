import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Receipt, Lightbulb, ListOrdered, PiggyBank, ShieldCheck,
  HeartPulse, Droplets, Scale, Bird, ShoppingCart, BarChart2, Menu, Stethoscope,
} from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';

const NAV_BY_WORKSPACE = {
  us: [
    { to: '/dashboard', label: 'Home',     Icon: LayoutDashboard, end: true },
    { to: '/expenses',  label: 'Expenses', Icon: Receipt },
    { to: '/insights',  label: 'Insights', Icon: Lightbulb },
    { to: '/priority',  label: 'Priority', Icon: ListOrdered },
  ],
  india: [
    { to: '/dashboard', label: 'Home',     Icon: LayoutDashboard, end: true },
    { to: '/expenses',  label: 'Expenses', Icon: Receipt },
    { to: '/savings',   label: 'Savings',  Icon: PiggyBank },
    { to: '/lic',       label: 'LIC',      Icon: ShieldCheck },
  ],
  health: [
    { to: '/health',        label: 'Overview', Icon: HeartPulse, end: true },
    { to: '/health/meals',  label: 'Meals',    Icon: Receipt },
    { to: '/health/water',  label: 'Water',    Icon: Droplets },
    { to: '/health/weight', label: 'Weight',   Icon: Scale },
  ],
  poultry: [
    { to: '/poultry',          label: 'Home',     Icon: Bird, end: true },
    { to: '/poultry/flock',    label: 'Batches',  Icon: Bird },
    { to: '/poultry/expenses', label: 'Expenses', Icon: ShoppingCart },
    { to: '/poultry/insights', label: 'Insights', Icon: BarChart2 },
  ],
  hospital: [
    { to: '/hospital', label: 'Hospital', Icon: Stethoscope, end: true },
  ],
};

export default function BottomNav({ onMenuClick }) {
  const { workspace } = useWorkspace();
  const nav = NAV_BY_WORKSPACE[workspace] ?? NAV_BY_WORKSPACE.us;
  const showMore = workspace !== 'health' && workspace !== 'hospital';

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-stretch justify-around"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {nav.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-medium transition-colors ${
              isActive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-gray-400 dark:text-gray-500'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={20} className={isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'} />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
      {showMore && (
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-medium text-gray-400 dark:text-gray-500"
        >
          <Menu size={20} />
          <span>More</span>
        </button>
      )}
    </nav>
  );
}
