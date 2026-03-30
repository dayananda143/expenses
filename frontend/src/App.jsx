import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import LoginPage from './pages/LoginPage';
import WorkspacePage from './pages/WorkspacePage';
import AccountsShell from './pages/accounts/AccountsShell';
import AccountsDashboard from './pages/accounts/AccountsDashboard';
import SavingsPage from './pages/accounts/SavingsPage';
import CreditCardsPage from './pages/accounts/CreditCardsPage';
import PaymentsPage from './pages/accounts/PaymentsPage';
import DashboardPage from './pages/DashboardPage';
import InsightsPage from './pages/InsightsPage';
import ExpensesPage from './pages/ExpensesPage';
import IndiaLedgerPage from './pages/IndiaLedgerPage';
import IndiaSavingsPage from './pages/IndiaSavingsPage';
import LICPage from './pages/LICPage';
import CategoriesPage from './pages/CategoriesPage';
import BudgetsPage from './pages/BudgetsPage';
import UsersPage from './pages/UsersPage';
import HospitalPage from './pages/HospitalPage';
import SalaryPage from './pages/SalaryPage';
import { useWorkspace } from './contexts/WorkspaceContext';
import { useAuth } from './contexts/AuthContext';

function WorkspaceRoute() {
  const { workspace } = useWorkspace();
  if (!workspace) return <Navigate to="/workspace" replace />;
  return <Outlet />;
}

function ExpensesRoute() {
  const { workspace } = useWorkspace();
  return workspace === 'india' ? <IndiaLedgerPage /> : <ExpensesPage />;
}

function HospitalRoute() {
  const { user } = useAuth();
  return (user?.is_admin || user?.hospital_access) ? <HospitalPage /> : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="workspace" element={<WorkspacePage />} />
        <Route path="accounts" element={<AccountsShell />}>
          <Route index element={<Navigate to="/accounts/dashboard" replace />} />
          <Route path="dashboard"    element={<AccountsDashboard />} />
          <Route path="savings"      element={<SavingsPage />} />
          <Route path="credit-cards" element={<CreditCardsPage />} />
          <Route path="payments"     element={<PaymentsPage />} />
        </Route>

        <Route element={<WorkspaceRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"  element={<DashboardPage />} />
            <Route path="insights"   element={<InsightsPage />} />
            <Route path="expenses"   element={<ExpensesRoute />} />
            <Route path="savings"    element={<IndiaSavingsPage />} />
            <Route path="lic"        element={<LICPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="budgets"    element={<BudgetsPage />} />
            <Route path="hospital"   element={<HospitalRoute />} />
            <Route path="salary"     element={<SalaryPage />} />
            <Route element={<AdminRoute />}>
              <Route path="users" element={<UsersPage />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
