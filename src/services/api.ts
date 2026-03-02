import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "https://editorial-production.up.railway.app/api";

export const api = axios.create({
  baseURL,
  withCredentials: false,
});

// ✅ Request interceptor: agrega token siempre
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Response interceptor: si 401 -> logout global
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      // limpia sesión
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // evita recargar si ya estás en /login
      if (window.location.pathname !== "/login") {
        // redirección dura para cortar estado roto
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);
