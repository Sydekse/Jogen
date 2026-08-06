const API_BASE_URL = "http://localhost:8000";

export async function getUserProfile() {
  const token = localStorage.getItem("access_token");
  if (!token) throw new Error("No access token found");

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/profile/`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user profile");
  }

  return response.json();
}
