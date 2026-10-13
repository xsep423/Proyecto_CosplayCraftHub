import { logout } from '../lib/auth';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

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
  return res.json();
}
