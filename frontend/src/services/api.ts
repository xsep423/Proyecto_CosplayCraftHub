import { logout } from '../lib/auth';

const PRODUCTION_API_URL = 'https://proyecto-cosplaycrafthub.onrender.com/api';

// 1) VITE_API_URL si está definida en el build.
// 2) Si la página corre en localhost, el backend local.
// 3) En cualquier otro dominio (Vercel), el backend de Render.
const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
export const API_URL: string =
  import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:8000/api' : PRODUCTION_API_URL);

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
      data.non_field_errors?.[0] ||
      'Ocurrió un error en la petición.'
    );
  }

  return data;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    logout();
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }
  if (!res.ok) throw await res.json().catch(() => ({}));
  if (res.status === 204) return undefined as T;
  return res.json();
}
