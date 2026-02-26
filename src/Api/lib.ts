import axios from "axios";

export const api = axios.create({
env.VITE_API_URL="http://192.168.1.76:8080/api",});

// Aquí esperamos que guardes el token en localStorage con la clave "token"
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
