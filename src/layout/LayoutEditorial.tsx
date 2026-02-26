import React, { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import styles from "./LayoutEditorial.module.css";

export default function LayoutEditorial() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Cerrar drawer al cambiar tamaño a desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 980) setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // (opcional) cerrar con ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={styles.app}>
      {/* Overlay (solo móvil cuando está abierto) */}
      <button
        type="button"
        className={styles.overlay}
        data-open={sidebarOpen ? "1" : "0"}
        aria-label="Cerrar menú"
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={styles.sidebar} data-open={sidebarOpen ? "1" : "0"}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logoCircle}>E</div>
          <div className={styles.logoText}>
            <div className={styles.logoTitle}>Editorial</div>
            <div className={styles.logoSubtitle}>Panel</div>
          </div>

          {/* Botón cerrar en móvil */}
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        <nav className={styles.nav}>
          <NavLink to="/" end className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`} onClick={() => setSidebarOpen(false)}>
            Dashboard
          </NavLink>

          <NavLink to="/convocatorias" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`} onClick={() => setSidebarOpen(false)}>
            Convocatorias
          </NavLink>

          <NavLink to="/libros" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`} onClick={() => setSidebarOpen(false)}>
            Libros
          </NavLink>

          <NavLink to="/capitulos" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`} onClick={() => setSidebarOpen(false)}>
            Capítulos
          </NavLink>

          <NavLink to="/dictamenes" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`} onClick={() => setSidebarOpen(false)}>
            Dictámenes
          </NavLink>

          <NavLink to="/constancias" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`} onClick={() => setSidebarOpen(false)}>
            Constancias
          </NavLink>

          <NavLink to="/usuarios" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`} onClick={() => setSidebarOpen(false)}>
            Usuarios
          </NavLink>
        </nav>
      </aside>

      {/* Main */}
      <div className={styles.main}>
        {/* Topbar (donde tienes buscador/botones arriba) */}
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.menuBtn}
            aria-label="Abrir menú"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>

          {/* Aquí va tu topbar real (buscador / botones) */}
          <div className={styles.topbarRight}>
            {/* Deja esto como contenedor; tu Dashboard renderiza abajo */}
          </div>
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}