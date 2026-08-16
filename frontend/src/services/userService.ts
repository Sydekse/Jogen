import { fetchWithAuth } from '@/src/lib/apiClient';
const API_BASE_URL = "http://localhost:8000";

export async function getUserProfile() {
  const token = localStorage.getItem("access_token");
  if (!token) throw new Error("No access token found");

  const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/auth/profile/`, {
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user profile");
  }

  return response.json();
}
