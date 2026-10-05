export const API_URL = "http://localhost:5000";

export async function checkAuth() {
  const response = await fetch(`${API_URL}/auth/me`, {
    credentials: "include",
  });

  if (!response.ok) return null;

  const data = await response.json();
  return data.authenticated ? data.user : null;
}

export async function logout() {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Logout failed");
  }
}
