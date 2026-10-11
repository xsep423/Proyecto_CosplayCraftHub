import { Navigate, Outlet, useLocation } from 'react-router';

function tokenValido(token: string | null): boolean {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export default function ProtectedRoute() {
  const location = useLocation();
  const token = localStorage.getItem('access_token');

  if (!tokenValido(token)) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
