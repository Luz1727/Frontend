import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore, type Role } from "../lib/stores/authStore";

export default function RequireRole({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Navigate to="/login" replace />;

  if (!allow.includes(user.role)) {
    return (
      <div style={{ padding: 16 }}>
        <h2 style={{ margin: 0 }}>Acceso denegado</h2>
        <p style={{ marginTop: 8, color: "#6B7280" }}>
          Tu rol (<b>{user.role}</b>) no tiene permiso para ver esta sección.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
