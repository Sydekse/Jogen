import { fetchWithAuth } from '@/src/lib/apiClient';
import { API_BASE_URL } from '@/src/config/api';

export async function getChatHistory() {
  const token = localStorage.getItem("access_token");
  if (!token) throw new Error("No access token found");

  const response = await fetchWithAuth(`${API_BASE_URL}/chat/history/`);

  if (!response.ok) {
    throw new Error("Failed to fetch chat history");
  }

  return response.json();
}

export async function renameChatSession(sessionId: string, newTitle: string) {
  const response = await fetchWithAuth(`${API_BASE_URL}/chat/session/${sessionId}/`, {
    method: "PATCH",
    body: JSON.stringify({ title: newTitle })
  });

  if (!response.ok) {
    throw new Error("Failed to rename chat session");
  }

  return response.json();
}

export async function deleteChatSession(sessionId: string) {
  const response = await fetchWithAuth(`${API_BASE_URL}/chat/session/${sessionId}/`, {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error("Failed to delete chat session");
  }

  return true;
}
