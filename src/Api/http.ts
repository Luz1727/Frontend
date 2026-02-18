import axios from "axios";
import { useAuthStore } from "../auth/authStore";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original?._retry) {
      original._retry = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      try {
        const r = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          null,
          { params: { refresh_token: refreshToken } }
        );

        useAuthStore.getState().setTokens(r.data.access_token, r.data.refresh_token);
        original.headers.Authorization = `Bearer ${r.data.access_token}`;

        return http(original);
      } catch {
        useAuthStore.getState().logout();
      }
    }

    return Promise.reject(error);
  }
);
