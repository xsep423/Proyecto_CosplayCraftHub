export type Role = 'admin' | 'maker' | 'viewer';

export function getRole(): Role {
  const token = localStorage.getItem('access_token');
  if (!token) return 'viewer';
  try {
    const { role } = JSON.parse(atob(token.split('.')[1]));
    return role === 'admin' || role === 'maker' || role === 'viewer' ? role : 'viewer';
  } catch {
    return 'viewer';
  }
}

export type CurrentUser = {
  id?: string | number;
  name?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  role?: string;
};

export function getCurrentUser(): CurrentUser {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getUserName(): string {
  const u = getCurrentUser();
  return (
    u.name ||
    `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
    u.username ||
    u.email ||
    'Usuario'
  );
}

export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
}
