import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

const localOnlyModules = [
  "/appointments",
  "/prescriptions",
  "/reports",
  "/invoices",
  "/payments",
  "/tasks",
  "/notifications",
  "/analytics",
];

api.interceptors.request.use((config) => {
  const url = String(config.url || "");

  if (
    localOnlyModules.some(
      (path) => url === path || url.startsWith(`${path}/`) || url.startsWith(`${path}?`)
    )
  ) {
    const error = new Error("Backend module not implemented yet");
    error.code = "CARETRACK_LOCAL_MODULE";
    return Promise.reject(error);
  }

  return config;
});

export default api;
