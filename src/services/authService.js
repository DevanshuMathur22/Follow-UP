import api from "./api";

export async function loginUser(credentials) {
  const response = await api.post("/auth/login", credentials);
  return response.data.data ?? response.data;
}

export async function registerUser(credentials) {
  const response = await api.post("/auth/register", credentials);
  return response.data.data ?? response.data;
}

export async function getCurrentUser() {
  const response = await api.get("/auth/me");
  return response.data.data ?? response.data;
}

export async function getRegistrationStatus() {
  const response = await api.get("/auth/register");
  return response.data.data ?? response.data;
}

export async function logoutUser() {
  try {
    await api.post("/auth/logout");
  } finally {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("caretrack-token");
      window.localStorage.removeItem("caretrack-user");
    }
  }
}

export async function changePassword(payload) {
  const response = await api.patch("/auth/password", payload);
  return response.data.data ?? response.data;
}
