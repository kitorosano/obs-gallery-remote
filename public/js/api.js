export async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && !url.startsWith('/api/auth/')) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    const error = new Error(data.error || `Error HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return data;
}
