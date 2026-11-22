import { logout } from '../lib/auth';

const PRODUCTION_API_URL = 'https://proyecto-cosplaycrafthub.onrender.com/api';

// 1) VITE_API_URL si está definida en el build.
// 2) Si la página corre en localhost, el backend local.
// 3) En cualquier otro dominio (Vercel), el backend de Render.
const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
export const API_URL: string =
  import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:8000/api' : PRODUCTION_API_URL);

export type ApiRequestError = Error & { data?: Record<string, unknown> };

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
    const detail = Array.isArray(data.detail) ? data.detail[0] : data.detail;
    const error = new Error(
      detail ||
      data.non_field_errors?.[0] ||
      'Ocurrió un error en la petición.'
    ) as ApiRequestError;
    // Para casos especiales (p. ej. code = 'email_not_verified' en el login)
    error.data = data;
    throw error;
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

/** Origen del backend (sin /api), para armar URLs de imágenes guardadas en la base. */
const API_ORIGIN = new URL(API_URL, window.location.href).origin;

/**
 * URL lista para <img>. Las imágenes en Cloudinary ya vienen absolutas; las que
 * viven en la base llegan como /api/media/<id>/ y se sirven desde el backend.
 */
export function mediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  return /^(https?:|blob:|data:)/.test(path) ? path : `${API_ORIGIN}${path}`;
}

/** Sube archivos (multipart). No fija Content-Type: el navegador agrega el boundary. */
export async function apiUpload<T>(path: string, form: FormData, method: 'POST' | 'PATCH' = 'POST'): Promise<T> {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${API_URL}${path}`, {
    method,
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) {
    logout();
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }
  if (res.status === 413) throw { file: ['La imagen es demasiado grande.'] };
  if (!res.ok) throw await res.json().catch(() => ({ detail: 'No se pudo subir el archivo.' }));
  return res.json();
}

/** Petición sin sesión (páginas públicas). */
export async function publicApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw { status: res.status };
  return res.json();
}

/** Descarga un archivo de la API con la sesión actual (exportaciones CSV/Excel). */
export async function apiDownload(path: string, filename: string): Promise<void> {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) {
    logout();
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }
  if (!res.ok) throw new Error('No se pudo descargar el archivo.');

  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
