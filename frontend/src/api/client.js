// API Client with Auth Token Header Interceptor & Error Parsing
export const getApiBase = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('custom_api_url');
    if (stored && stored.trim()) return stored.trim().replace(/\/$/, '');
  }
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    return `http://${window.location.hostname}:8000`;
  }
  return 'http://localhost:8000';
};

export async function apiClient(endpoint, { body, ...customConfig } = {}) {
  const token = localStorage.getItem('artisan_token');
  const headers = { 'Content-Type': 'application/json' };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const isFormData = body instanceof FormData;
  if (isFormData) {
    delete headers['Content-Type']; // Let browser set multipart boundary
  }

  const config = {
    method: body ? 'POST' : 'GET',
    ...customConfig,
    headers: {
      ...headers,
      ...customConfig.headers,
    },
  };

  if (body) {
    config.body = isFormData ? body : JSON.stringify(body);
  }

  const apiBase = getApiBase();
  const url = `${apiBase}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, config);

    if (response.status === 401) {
      // Unauthorized: could clear token if token expired
      if (token && !endpoint.includes('/auth/login')) {
        localStorage.removeItem('artisan_token');
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }

    // Handle streaming or blob responses if necessary
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('image/')) {
      if (!response.ok) throw new Error('Image request failed');
      return await response.blob();
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.detail || data.message || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function pingBackend() {
  try {
    const res = await fetch(`${getApiBase()}/`);
    if (res.ok) {
      const data = await res.json();
      return { online: true, ...data };
    }
    return { online: false };
  } catch {
    return { online: false };
  }
}

