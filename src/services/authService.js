import api from "./api";

export async function loginUser(credentials) {
  try {
    const response = await api.post("/auth/login", credentials);
    return response.data.data ?? response.data;
  } catch (error) {
    const isDemoLogin =
      credentials.email.toLowerCase() === "doctor@caretrack.demo" &&
      credentials.password === "CareTrack@2026";

    if (!error.response && isDemoLogin) {
      return {
        token: "caretrack-demo-session",
        user: { name: "Dr. CareTrack", email: credentials.email, role: "doctor" },
        isDemo: true,
      };
    }

    throw error;
  }
}

export async function registerUser(credentials) {
  const response = await api.post("/auth/register", credentials);
  return response.data.data ?? response.data;
}

export function logoutUser() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("caretrack-token");
    window.localStorage.removeItem("caretrack-user");
  }
}

export async function changePassword(payload) {
  const response = await api.patch("/auth/password", payload);
  return response.data.data ?? response.data;
}
