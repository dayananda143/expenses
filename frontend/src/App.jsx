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
import CarFinancePage from './pages/accounts/CarFinancePage';
import DashboardPage from './pages/DashboardPage';
import InsightsPage from './pages/InsightsPage';
import PriorityPage from './pages/PriorityPage';
import ExpensesPage from './pages/ExpensesPage';
import IndiaLedgerPage from './pages/IndiaLedgerPage';
import IndiaSavingsPage from './pages/IndiaSavingsPage';
import LICPage from './pages/LICPage';
import CategoriesPage from './pages/CategoriesPage';
import BudgetsPage from './pages/BudgetsPage';
import UsersPage from './pages/UsersPage';
import HospitalPage from './pages/HospitalPage';
import HospitalDashboardPage from './pages/HospitalDashboardPage';
import HospitalCategoriesPage from './pages/HospitalCategoriesPage';
import SalaryPage from './pages/SalaryPage';
import IndiaListPage from './pages/IndiaListPage';
import HealthPage from './pages/HealthPage';
import HealthMealsPage from './pages/HealthMealsPage';
import HealthWaterPage from './pages/HealthWaterPage';
import HealthWeightPage from './pages/HealthWeightPage';
import PoultryPage from './pages/PoultryPage';
import PoultryFlockPage from './pages/PoultryFlockPage';
import PoultryMortalityPage from './pages/PoultryMortalityPage';
import PoultryExpensesPage from './pages/PoultryExpensesPage';
import PoultrySalesPage from './pages/PoultrySalesPage';
import PoultryInsightsPage from './pages/PoultryInsightsPage';
import PoultryStakePage from './pages/PoultryStakePage';
import LoanPage from './pages/LoanPage';
import UmaSbiPage from './pages/UmaSbiPage';
import TripsPage from './pages/TripsPage';
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

function DashboardRoute() {
  const { workspace } = useWorkspace();
  if (workspace === 'health') return <Navigate to="/health" replace />;
  if (workspace === 'poultry') return <Navigate to="/poultry" replace />;
  if (workspace === 'hospital') return <Navigate to="/hospital-dashboard" replace />;
  return <DashboardPage />;
}

function HospitalRoute() {
  const { user } = useAuth();
  return (user?.is_admin || user?.hospital_access) ? <HospitalPage /> : <Navigate to="/dashboard" replace />;
}

function HospitalDashboardRoute() {
  const { user } = useAuth();
  return (user?.is_admin || user?.hospital_access) ? <HospitalDashboardPage /> : <Navigate to="/dashboard" replace />;
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
          <Route path="payments"      element={<PaymentsPage />} />
          <Route path="car-finance"  element={<CarFinancePage />} />
        </Route>

        <Route element={<WorkspaceRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"  element={<DashboardRoute />} />
            <Route path="insights"   element={<InsightsPage />} />
            <Route path="priority"   element={<PriorityPage />} />
            <Route path="expenses"   element={<ExpensesRoute />} />
            <Route path="savings"    element={<IndiaSavingsPage />} />
            <Route path="lic"        element={<LICPage />} />
            <Route path="loans"      element={<LoanPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="budgets"    element={<BudgetsPage />} />
            <Route path="hospital"            element={<HospitalRoute />} />
            <Route path="hospital-dashboard"  element={<HospitalDashboardRoute />} />
            <Route path="salary"     element={<SalaryPage />} />
            <Route path="india-list" element={<IndiaListPage />} />
            <Route path="health" element={<HealthPage />} />
            <Route path="health/meals" element={<HealthMealsPage />} />
            <Route path="health/water" element={<HealthWaterPage />} />
            <Route path="health/weight" element={<HealthWeightPage />} />
            <Route path="poultry" element={<PoultryPage />} />
            <Route path="poultry/flock" element={<PoultryFlockPage />} />
            <Route path="poultry/mortality" element={<PoultryMortalityPage />} />
            <Route path="poultry/expenses" element={<PoultryExpensesPage />} />
            <Route path="poultry/sales" element={<PoultrySalesPage />} />
            <Route path="poultry/insights" element={<PoultryInsightsPage />} />
            <Route path="poultry/stake" element={<PoultryStakePage />} />
            <Route path="poultry/uma-sbi" element={<UmaSbiPage />} />
            <Route path="trips"         element={<TripsPage />} />
            <Route element={<AdminRoute />}>
              <Route path="users" element={<UsersPage />} />
              <Route path="hospital-categories" element={<HospitalCategoriesPage />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
