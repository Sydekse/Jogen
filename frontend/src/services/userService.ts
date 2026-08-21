import { fetchWithAuth } from '@/src/lib/apiClient';
import { API_BASE_URL } from '@/src/config/api';

export async function getUserProfile() {
  const token = localStorage.getItem("access_token");
  if (!token) throw new Error("No access token found");

  const response = await fetchWithAuth(`${API_BASE_URL}/auth/profile/`, {
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user profile");
  }

  return response.json();
}
