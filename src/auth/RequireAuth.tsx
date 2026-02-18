import { Navigate } from "react-router-dom";
import { useAuthStore } from "./authStore";

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const token = useAuthStore((s) => s.accessToken);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
