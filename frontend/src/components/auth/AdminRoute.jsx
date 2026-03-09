import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminRoute() {
  const { user } = useAuth();
  return user?.is_admin ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
