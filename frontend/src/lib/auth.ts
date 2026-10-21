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

export type SessionWorkshop = { id: number; name: string; slug: string };

export type Session = {
  access: string;
  refresh: string;
  user: CurrentUser;
  workshop: SessionWorkshop;
};

/** Guarda lo que devuelven /auth/login/ y /auth/register/. */
export function saveSession(data: Session) {
  localStorage.setItem('access_token', data.access);
  localStorage.setItem('refresh_token', data.refresh);
  localStorage.setItem('user', JSON.stringify(data.user));
  localStorage.setItem('workshop', JSON.stringify(data.workshop));
}

/** Taller (tenant) de la sesión actual. Solo es informativo: el backend lo valida. */
export function getWorkshop(): SessionWorkshop | null {
  try {
    const raw = localStorage.getItem('workshop');
    if (raw) return JSON.parse(raw);
    // Sesiones viejas: se toma del token
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    const { workshop_id, workshop } = JSON.parse(atob(token.split('.')[1]));
    return workshop_id ? { id: workshop_id, name: workshop, slug: '' } : null;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem('workshop');
}
