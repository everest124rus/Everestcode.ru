// Centralized API configuration
// In production (non-localhost domain), always use relative '/api' to avoid CORS/mixed-content.
// On localhost, allow overriding via REACT_APP_API_URL, fallback to proxy path.
const getApiBaseUrl = (): string => {
  try {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    if (!isLocal) return '/api';
  } catch {
    // window is not available (SSR/build) → use safe default; CRA replaces env at build
  }
  return process.env.REACT_APP_API_URL || '/api';
};

const API_URL = getApiBaseUrl();

export const buildApiUrl = (path: string) => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_URL}${API_URL.endsWith('/') ? '' : '/'}${cleanPath}`;
};

export const authHeaders = (token?: string | null) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};
