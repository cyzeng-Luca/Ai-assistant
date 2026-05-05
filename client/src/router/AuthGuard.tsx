import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '@store';

export default function AuthGuard() {
  const user = useAppStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
