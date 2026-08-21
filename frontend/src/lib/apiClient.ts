import { API_BASE_URL } from '@/src/config/api';

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('access_token');
  
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Ensure Content-Type is set if body is present and it's not FormData
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh: refreshToken }),
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          localStorage.setItem('access_token', data.access);
          if (data.refresh) {
            localStorage.setItem('refresh_token', data.refresh);
          }

          // Retry the original request with the new token
          headers.set('Authorization', `Bearer ${data.access}`);
          response = await fetch(url, { ...options, headers });
        } else {
          // Refresh token invalid or expired
          handleAuthFailure();
        }
      } catch (error) {
        console.error('Failed to refresh token:', error);
        handleAuthFailure();
      }
    } else {
      handleAuthFailure();
    }
  }

  return response;
}

function handleAuthFailure() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  
  // Only redirect if we are not already on the login page or a public page
  if (typeof window !== 'undefined' && window.location.pathname !== '/') {
    window.location.href = '/';
  }
}
