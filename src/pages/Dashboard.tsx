// DashboardGodSupreme.tsx (FULL + FIXED + Light/Dark Toggle)
// ✅ Corrige bugs de parseo (CSS_GLOBAL seguro)
// ✅ Toggle modo oscuro/claro (texto negro en claro / texto blanco en oscuro)
// ✅ En modo oscuro: texto del submenu <select><option> NEGRO (como pediste)
// ✅ Stats trend render correcto aunque sea 0
// ✅ Partículas estables (no cambian cada render)
// ✅ Reloj en vivo (actualiza cada segundo)
// ✅ CORREGIDO: Variables CSS aplicadas correctamente

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getDashboardSummary, DashboardSummary } from "../services/dashboard";

type Stat = {
  label: string;
  value: number;
  hint: string;
  tone: "neutral" | "info" | "warn" | "ok";
  icon: string;
  trend?: number; // %
};

type ThemeMode = "dark" | "light";

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [selectedPeriod, setSelectedPeriod] = useState<"hoy" | "semana" | "mes" | "año">("hoy");
  const [selectedView, setSelectedView] = useState<"grid" | "list" | "chart">("grid");

  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const [notifications] = useState(3);

  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("theme");
    return saved === "light" || saved === "dark" ? (saved as ThemeMode) : "dark";
  });

  const [now, setNow] = useState(() => new Date());

  const containerRef = useRef<HTMLDivElement>(null);

  // ===== Mouse 3D =====
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setMousePosition({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // ===== Clock tick =====
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ===== Theme persist =====
  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  // ===== Load summary =====
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErrMsg(null);
        const data = await getDashboardSummary();
        if (alive) setSummary(data);
      } catch (err: any) {
        const msg =
          err?.response?.data?.detail ??
          "No se pudo cargar el dashboard (revisa que el backend esté encendido).";
        if (alive) setErrMsg(msg);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ===== Partículas estables =====
  const particles = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => {
      const left = Math.random() * 100;
      const top = Math.random() * 100;
      const dur = 15 + Math.random() * 20;
      const delay = Math.random() * 10;
      const hue = i * 7;
      return { i, left, top, dur, delay, hue };
    });
  }, []);

  const stats: Stat[] = useMemo(() => {
    const s = summary ?? {
      capitulos_recibidos_hoy: 0,
      en_revision: 0,
      correcciones: 0,
      aprobados: 0,
      constancias_pendientes: 0,
    };

    const trends = {
      capitulos_recibidos_hoy: 12,
      en_revision: -3,
      correcciones: 5,
      aprobados: 8,
      constancias_pendientes: -2,
    };

    return [
      {
        label: "Capítulos recibidos",
        value: s.capitulos_recibidos_hoy,
        hint: "Hoy",
        tone: "info",
        icon: "📥",
        trend: trends.capitulos_recibidos_hoy,
      },
      {
        label: "En revisión",
        value: s.en_revision,
        hint: "Activos",
        tone: "neutral",
        icon: "🔍",
        trend: trends.en_revision,
      },
      {
        label: "Pendientes de corrección",
        value: s.correcciones,
        hint: "Requieren respuesta",
        tone: "warn",
        icon: "✏️",
        trend: trends.correcciones,
      },
      {
        label: "Aprobados",
        value: s.aprobados,
        hint: "Listos",
        tone: "ok",
        icon: "✅",
        trend: trends.aprobados,
      },
      {
        label: "Constancias por emitir",
        value: s.constancias_pendientes,
        hint: "Pendientes",
        tone: "warn",
        icon: "📜",
        trend: trends.constancias_pendientes,
      },
    ];
  }, [summary]);

  // Simulados
  const [realtimeActivity] = useState([
    { time: "hace 5s", action: "Capítulo 'Educación digital' recibido", user: "Ana García", status: "info", avatar: "AG" },
    { time: "hace 23s", action: "Dictamen completado", user: "Dr. Martínez", status: "ok", avatar: "DM" },
    { time: "hace 1m", action: "Correcciones solicitadas", user: "Sistema", status: "warn", avatar: "SY" },
    { time: "hace 2m", action: "Constancia generada #2345", user: "Admin", status: "ok", avatar: "AD" },
  ]);

  const pendingChapters = [
    {
      id: "DIC-2026-02-001",
      title: "Educación y talento en el siglo XXI",
      author: "Dr. Juan Pérez",
      book: "Pedagogía Moderna",
      status: "warn",
      statusText: "Correcciones",
      date: "2026-02-15",
      priority: "alta",
      comments: 3,
    },
    {
      id: "DIC-2026-02-002",
      title: "Inteligencia Artificial en el aula",
      author: "Dra. María González",
      book: "Tecnología Educativa",
      status: "info",
      statusText: "En revisión",
      date: "2026-02-14",
      priority: "media",
      comments: 1,
    },
    {
      id: "DIC-2026-02-003",
      title: "Inclusión educativa",
      author: "Mtro. Carlos López",
      book: "Diversidad en el aula",
      status: "ok",
      statusText: "Aprobado",
      date: "2026-02-13",
      priority: "baja",
      comments: 0,
    },
    {
      id: "DIC-2026-02-004",
      title: "Neurociencia y aprendizaje",
      author: "Dra. Laura Sánchez",
      book: "Cerebro y Educación",
      status: "warn",
      statusText: "Urgente",
      date: "2026-02-12",
      priority: "alta",
      comments: 5,
    },
  ];

  const performanceMetrics = {
    eficiencia: 87,
    tiempoPromedio: "2.3 días",
    satisfaccion: 94,
    productividad: 78,
  };

  // ===== Theme colors - CORREGIDO: Definimos los colores directamente =====
  const themeColors = useMemo(() => {
    if (theme === "dark") {
      return {
        bg: "#0a0a0f",
        text: "#ffffff",
        muted: "#94a3b8",
        card: "rgba(255,255,255,0.03)",
        card2: "rgba(255,255,255,0.02)",
        border: "rgba(255,255,255,0.10)",
        border2: "rgba(255,255,255,0.06)",
      };
    } else {
      return {
        bg: "#f7f8fb",
        text: "#000000",
        muted: "#475569",
        card: "#ffffff",
        card2: "#ffffff",
        border: "rgba(0,0,0,0.12)",
        border2: "rgba(0,0,0,0.08)",
      };
    }
  }, [theme]);

  if (loading) {
    return (
      <div style={{ ...styles.loadingContainer, background: themeColors.bg, color: themeColors.text }}>
        <div style={styles.loadingCube}>
          <div style={{ ...styles.cube1, borderColor: "#3b82f6", background: "rgba(59,130,246,0.2)" }} />
          <div style={{ ...styles.cube2, borderColor: "#3b82f6", background: "rgba(59,130,246,0.2)" }} />
          <div style={{ ...styles.cube3, borderColor: "#3b82f6", background: "rgba(59,130,246,0.2)" }} />
        </div>
        <div style={{ ...styles.loadingText, color: themeColors.muted }}>Inicializando dashboard cuántico...</div>
        <div style={styles.loadingProgress}>
          <div style={styles.progressBar} />
        </div>
        <style>{CSS_GLOBAL}</style>
      </div>
    );
  }

  if (errMsg) {
    return (
      <div style={{ ...styles.errorContainer, background: themeColors.bg, color: themeColors.text }}>
        <div style={styles.errorGlitch} data-text="ERROR">
          ERROR
        </div>
        <div style={styles.errorIcon}>⚠️</div>
        <div style={styles.errorTitle}>Falla en la matrix</div>
        <div style={{ ...styles.errorMessage, color: themeColors.muted }}>{errMsg}</div>
        <button style={styles.retryButton} onClick={() => window.location.reload()}>
          REINICIAR SISTEMA
        </button>
        <style>{CSS_GLOBAL}</style>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        ...styles.wrap,
        background: themeColors.bg,
        color: themeColors.text,
      }}
      data-theme={theme}
      className="dash"
    >
      {/* Fondo cuántico */}
      <div style={styles.quantumField} aria-hidden>
        {particles.map((p) => (
          <div
            key={p.i}
            style={{
              ...styles.quantumParticle,
              left: `${p.left}%`,
              top: `${p.top}%`,
              animation: `quantumFloat ${p.dur}s linear infinite`,
              animationDelay: `${p.delay}s`,
              background: `hsl(${p.hue}, 80%, 60%)`,
            }}
          />
        ))}
      </div>

      {/* Luz ambiental */}
      <div
        style={{
          ...styles.ambientLight,
          background: `radial-gradient(circle, ${theme === "dark" ? "rgba(59,130,246,0.15)" : "rgba(37,99,235,0.10)"} 0%, transparent 70%)`,
          transform: `translate(${mousePosition.x * 30}px, ${mousePosition.y * 30}px)`,
        }}
        aria-hidden
      />

      {/* Header */}
      <div style={styles.header}>
        <div
          style={{
            ...styles.headerGlow,
            background: `radial-gradient(circle at 50% 50%, ${theme === "dark" ? "rgba(59,130,246,0.10)" : "rgba(37,99,235,0.10)"}, transparent 70%)`,
          }}
          aria-hidden
        />

        <div style={styles.headerTop}>
          <div style={styles.brand}>
            <div style={styles.brandIcon}>⚡</div>
            <div style={styles.brandText}>
              <span style={{ ...styles.brandName, color: themeColors.text }}>EDITORIAL</span>
              <span style={{ ...styles.brandVersion, color: themeColors.muted }}>NEXUS v3.0</span>
            </div>
          </div>

          <div style={styles.notifications}>
            {/* ✅ Toggle theme */}
            <button
              type="button"
              style={{
                ...styles.themeToggle,
                background: themeColors.card2,
                borderColor: themeColors.border,
                color: themeColors.text,
              }}
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
            >
              <span style={styles.themeIcon} aria-hidden>
                {theme === "dark" ? "☀️" : "🌙"}
              </span>
              <span style={styles.themeText}>
                {theme === "dark" ? "CLARO" : "OSCURO"}
              </span>
            </button>

            <div style={styles.notificationBell}>
              🔔
              {notifications > 0 && <span style={styles.notificationBadge}>{notifications}</span>}
            </div>

            <div style={{ ...styles.userProfile, background: themeColors.card, borderColor: themeColors.border }}>
              <div style={styles.userAvatar}>AD</div>
              <div style={styles.userInfo}>
                <span style={{ ...styles.userName, color: themeColors.text }}>Admin Dios</span>
                <span style={{ ...styles.userRole, color: themeColors.muted }}>Editorial Supreme</span>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.headerContent}>
          <div style={styles.titleSection}>
            <h1 style={styles.h1}>
              <span style={{ ...styles.h1Glitch, color: themeColors.text }}>DASHBOARD</span>
              
            </h1>

            <div style={{ ...styles.dateTime, color: themeColors.muted }}>
              <span>
                {now.toLocaleDateString("es-MX", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span> • </span>
              <span>{now.toLocaleTimeString("es-MX")}</span>
            </div>
          </div>

          <div style={styles.headerActions}>
            <div style={{ ...styles.periodSelector, background: themeColors.card2, borderColor: themeColors.border }}>
              {(["hoy", "semana", "mes", "año"] as const).map((period) => (
                <button
                  key={period}
                  style={{
                    ...styles.periodButton,
                    color: selectedPeriod === period ? "#fff" : themeColors.muted,
                    background: selectedPeriod === period ? "#3b82f6" : "transparent",
                  }}
                  onClick={() => setSelectedPeriod(period)}
                  type="button"
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>

            <div style={{ ...styles.viewSelector, background: themeColors.card2, borderColor: themeColors.border }}>
              <button
                style={{
                  ...styles.viewButton,
                  color: selectedView === "grid" ? "#fff" : themeColors.muted,
                  background: selectedView === "grid" ? "#3b82f6" : "transparent",
                }}
                onClick={() => setSelectedView("grid")}
                type="button"
              >
                ⊞
              </button>
              <button
                style={{
                  ...styles.viewButton,
                  color: selectedView === "list" ? "#fff" : themeColors.muted,
                  background: selectedView === "list" ? "#3b82f6" : "transparent",
                }}
                onClick={() => setSelectedView("list")}
                type="button"
              >
                ≡
              </button>
              <button
                style={{
                  ...styles.viewButton,
                  color: selectedView === "chart" ? "#fff" : themeColors.muted,
                  background: selectedView === "chart" ? "#3b82f6" : "transparent",
                }}
                onClick={() => setSelectedView("chart")}
                type="button"
              >
                📊
              </button>
            </div>

            <button
              style={{
                ...styles.refreshButton,
                background: themeColors.card2,
                borderColor: themeColors.border,
                color: themeColors.text,
              }}
              onClick={() => window.location.reload()}
              type="button"
            >
              <span style={styles.refreshIcon}>⟳</span>
              <span style={styles.refreshText}>SINCRONIZAR</span>
            </button>
          </div>
        </div>

        {/* Métricas rápidas */}
        <div style={{ ...styles.quickMetrics, background: themeColors.card2, borderColor: themeColors.border }}>
          <div style={styles.metric}>
            <span style={{ ...styles.metricLabel, color: themeColors.muted }}>Eficiencia</span>
            <span style={{ ...styles.metricValue, color: themeColors.text }}>{performanceMetrics.eficiencia}%</span>
            <div style={styles.metricBar}>
              <div style={{ ...styles.metricFill, width: `${performanceMetrics.eficiencia}%` }} />
            </div>
          </div>

          <div style={styles.metric}>
            <span style={{ ...styles.metricLabel, color: themeColors.muted }}>Tiempo promedio</span>
            <span style={{ ...styles.metricValue, color: themeColors.text }}>{performanceMetrics.tiempoPromedio}</span>
          </div>

          <div style={styles.metric}>
            <span style={{ ...styles.metricLabel, color: themeColors.muted }}>Satisfacción</span>
            <span style={{ ...styles.metricValue, color: themeColors.text }}>{performanceMetrics.satisfaccion}%</span>
            <div style={styles.metricBar}>
              <div style={{ ...styles.metricFill, width: `${performanceMetrics.satisfaccion}%` }} />
            </div>
          </div>

          <div style={styles.metric}>
            <span style={{ ...styles.metricLabel, color: themeColors.muted }}>Productividad</span>
            <span style={{ ...styles.metricValue, color: themeColors.text }}>{performanceMetrics.productividad}%</span>
            <div style={styles.metricBar}>
              <div style={{ ...styles.metricFill, width: `${performanceMetrics.productividad}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        {stats.map((s) => (
          <div
            key={s.label}
            className="statCard"
            style={{
              ...styles.statCard,
              background: themeColors.card,
              borderColor: themeColors.border,
              transform: `perspective(1000px) rotateX(${mousePosition.y * 5}deg) rotateY(${mousePosition.x * 5}deg) scale(${
                hoveredCard === s.label ? 1.05 : 1
              })`,
              zIndex: hoveredCard === s.label ? 10 : 1,
            }}
            onMouseEnter={() => setHoveredCard(s.label)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="statCardGlow" style={styles.statCardGlow} />
            <div className="statCardHologram" style={styles.statCardHologram} />

            <div style={styles.statHeader}>
              <span style={styles.statIcon}>{s.icon}</span>
              <div style={styles.statBadgeContainer}>
                <span style={{ ...styles.statBadge, ...badgeTone(s.tone) }}>{s.hint}</span>
              </div>
            </div>

            <div style={{ ...styles.statValue, color: themeColors.text }}>{s.value.toLocaleString()}</div>
            <div style={{ ...styles.statLabel, color: themeColors.muted }}>{s.label}</div>

            {/* ✅ trend render seguro */}
            {s.trend !== undefined && (
              <div
                style={{
                  ...styles.statTrend,
                  color: s.trend > 0 ? "#10b981" : s.trend < 0 ? "#ef4444" : themeColors.muted,
                }}
              >
                {s.trend > 0 ? "▲" : s.trend < 0 ? "▼" : "◆"} {Math.abs(s.trend)}% vs período anterior
              </div>
            )}

            <div style={{ ...styles.statFooter, color: themeColors.muted }}>
              <span>Ver detalles →</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div style={styles.mainGrid}>
        {/* Left */}
        <div style={styles.leftColumn}>
          <div style={{ ...styles.section, background: themeColors.card2, borderColor: themeColors.border }}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionTitle}>
                <span style={styles.sectionIcon}>⚡</span>
                <h3 style={{ color: themeColors.text }}>Actividad en tiempo real</h3>
              </div>
              <span style={styles.liveBadge}>LIVE</span>
            </div>

            <div style={styles.activityFeed}>
              {realtimeActivity.map((activity, i) => (
                <div key={i} style={{ ...styles.activityItem, borderBottomColor: themeColors.border2 }}>
                  <div style={styles.activityAvatar}>{activity.avatar}</div>
                  <div style={styles.activityContent}>
                    <div style={{ ...styles.activityAction, color: themeColors.text }}>{activity.action}</div>
                    <div style={{ ...styles.activityMeta, color: themeColors.muted }}>
                      <span>{activity.user}</span>
                      <span style={styles.activityTime}>• {activity.time}</span>
                    </div>
                  </div>
                  <div style={{ ...styles.activityStatus, ...badgeTone(activity.status as any) }} />
                </div>
              ))}
            </div>

            <button
              style={{
                ...styles.viewAllButton,
                borderColor: themeColors.border,
                color: themeColors.muted,
              }}
              type="button"
            >
              Ver toda la actividad →
            </button>
          </div>
        </div>

        {/* Center */}
        <div style={styles.centerColumn}>
          <div style={{ ...styles.section, background: themeColors.card2, borderColor: themeColors.border }}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionTitle}>
                <span style={styles.sectionIcon}>📋</span>
                <h3 style={{ color: themeColors.text }}>Capítulos pendientes</h3>
              </div>

              <div style={styles.tableFilters}>
                <select
                  style={{
                    ...styles.filterSelect,
                    background: themeColors.card,
                    borderColor: themeColors.border,
                    color: themeColors.text,
                  }}
                  defaultValue="all"
                >
                  <option value="all">Todos los estados</option>
                  <option value="alta">Alta prioridad</option>
                  <option value="revision">En revisión</option>
                  <option value="correcciones">Correcciones</option>
                </select>
                <button
                  style={{
                    ...styles.filterButton,
                    background: themeColors.card,
                    borderColor: themeColors.border,
                    color: themeColors.text,
                  }}
                  type="button"
                  aria-label="Buscar"
                >
                  🔍
                </button>
              </div>
            </div>

            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, color: themeColors.muted, borderBottomColor: themeColors.border }}>Folio</th>
                    <th style={{ ...styles.th, color: themeColors.muted, borderBottomColor: themeColors.border }}>Capítulo</th>
                    <th style={{ ...styles.th, color: themeColors.muted, borderBottomColor: themeColors.border }}>Autor</th>
                    <th style={{ ...styles.th, color: themeColors.muted, borderBottomColor: themeColors.border }}>Estado</th>
                    <th style={{ ...styles.th, color: themeColors.muted, borderBottomColor: themeColors.border }}>Prioridad</th>
                    <th style={{ ...styles.th, color: themeColors.muted, borderBottomColor: themeColors.border }}>Comentarios</th>
                    <th style={{ ...styles.th, color: themeColors.muted, borderBottomColor: themeColors.border }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingChapters.map((chapter, i) => (
                    <tr key={i} className="tableRow">
                      <td style={{ ...styles.td, borderBottomColor: themeColors.border2, color: themeColors.text }}>
                        <span style={styles.folio}>{chapter.id}</span>
                      </td>
                      <td style={{ ...styles.td, borderBottomColor: themeColors.border2 }}>
                        <div style={{ ...styles.chapterTitle, color: themeColors.text }}>{chapter.title}</div>
                        <div style={{ ...styles.chapterBook, color: themeColors.muted }}>{chapter.book}</div>
                      </td>
                      <td style={{ ...styles.td, borderBottomColor: themeColors.border2, color: themeColors.text }}>{chapter.author}</td>
                      <td style={{ ...styles.td, borderBottomColor: themeColors.border2 }}>
                        <span style={{ ...styles.statusPill, ...badgeTone(chapter.status as any) }}>
                          {chapter.statusText}
                        </span>
                      </td>
                      <td style={{ ...styles.td, borderBottomColor: themeColors.border2 }}>
                        <span
                          style={{
                            ...styles.priorityBadge,
                            background:
                              chapter.priority === "alta"
                                ? "#fee2e2"
                                : chapter.priority === "media"
                                ? "#fef3c7"
                                : "#e6f7e6",
                            color:
                              chapter.priority === "alta"
                                ? "#991b1b"
                                : chapter.priority === "media"
                                ? "#92400e"
                                : "#166534",
                          }}
                        >
                          {chapter.priority}
                        </span>
                      </td>
                      <td style={{ ...styles.td, borderBottomColor: themeColors.border2 }}>
                        <span style={{ ...styles.commentCount, color: themeColors.muted }}>💬 {chapter.comments}</span>
                      </td>
                      <td style={{ ...styles.td, borderBottomColor: themeColors.border2 }}>
                        <button
                          style={{
                            ...styles.tableAction,
                            background: themeColors.card,
                            borderColor: themeColors.border,
                            color: themeColors.text,
                          }}
                          className="tableAction"
                          type="button"
                        >
                          <span>Ver</span>
                          <span style={styles.actionArrow}>→</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ ...styles.tableFooter, color: themeColors.muted }}>
              <span>Mostrando 4 de 12 capítulos</span>
              <div style={styles.pagination}>
                <button
                  style={{
                    ...styles.pageButton,
                    background: themeColors.card,
                    borderColor: themeColors.border,
                    color: themeColors.muted,
                  }}
                  type="button"
                >
                  ←
                </button>
                <button
                  style={{
                    ...styles.pageButton,
                    ...styles.pageButtonActive,
                  }}
                  type="button"
                >
                  1
                </button>
                <button
                  style={{
                    ...styles.pageButton,
                    background: themeColors.card,
                    borderColor: themeColors.border,
                    color: themeColors.muted,
                  }}
                  type="button"
                >
                  2
                </button>
                <button
                  style={{
                    ...styles.pageButton,
                    background: themeColors.card,
                    borderColor: themeColors.border,
                    color: themeColors.muted,
                  }}
                  type="button"
                >
                  3
                </button>
                <button
                  style={{
                    ...styles.pageButton,
                    background: themeColors.card,
                    borderColor: themeColors.border,
                    color: themeColors.muted,
                  }}
                  type="button"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right */}
        <div style={styles.rightColumn}>
          <div style={{ ...styles.section, background: themeColors.card2, borderColor: themeColors.border }}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionTitle}>
                <span style={styles.sectionIcon}>⚡</span>
                <h3 style={{ color: themeColors.text }}>Acciones rápidas</h3>
              </div>
            </div>

            <div style={styles.actionsGrid}>
              <button
                style={{
                  ...styles.actionCard,
                  background: themeColors.card,
                  borderColor: themeColors.border,
                  color: themeColors.text,
                }}
                className="actionCard"
                type="button"
              >
                <span style={styles.actionIcon}>📚</span>
                <div style={styles.actionInfo}>
                  <span style={{ ...styles.actionLabel, color: themeColors.text }}>Crear libro</span>
                  <span style={{ ...styles.actionDesc, color: themeColors.muted }}>Nuevo proyecto editorial</span>
                </div>
                <span style={{ ...styles.actionShortcut, color: themeColors.muted }}>⌘N</span>
              </button>

              <button
                style={{
                  ...styles.actionCard,
                  background: themeColors.card,
                  borderColor: themeColors.border,
                  color: themeColors.text,
                }}
                className="actionCard"
                type="button"
              >
                <span style={styles.actionIcon}>⚖️</span>
                <div style={styles.actionInfo}>
                  <span style={{ ...styles.actionLabel, color: themeColors.text }}>Asignar dictaminador</span>
                  <span style={{ ...styles.actionDesc, color: themeColors.muted }}>Seleccionar evaluador</span>
                </div>
                <span style={{ ...styles.actionShortcut, color: themeColors.muted }}>⌘D</span>
              </button>

              <button
                style={{
                  ...styles.actionCard,
                  background: themeColors.card,
                  borderColor: themeColors.border,
                  color: themeColors.text,
                }}
                className="actionCard"
                type="button"
              >
                <span style={styles.actionIcon}>📜</span>
                <div style={styles.actionInfo}>
                  <span style={{ ...styles.actionLabel, color: themeColors.text }}>Generar constancias</span>
                  <span style={{ ...styles.actionDesc, color: themeColors.muted }}>Emitir documentos</span>
                </div>
                <span style={{ ...styles.actionShortcut, color: themeColors.muted }}>⌘G</span>
              </button>

              <button
                style={{
                  ...styles.actionCard,
                  background: themeColors.card,
                  borderColor: themeColors.border,
                  color: themeColors.text,
                }}
                className="actionCard"
                type="button"
              >
                <span style={styles.actionIcon}>📊</span>
                <div style={styles.actionInfo}>
                  <span style={{ ...styles.actionLabel, color: themeColors.text }}>Exportar reporte</span>
                  <span style={{ ...styles.actionDesc, color: themeColors.muted }}>PDF o Excel</span>
                </div>
                <span style={{ ...styles.actionShortcut, color: themeColors.muted }}>⌘E</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Global CSS */}
      <style>{CSS_GLOBAL}</style>
    </div>
  );
}

function badgeTone(tone: "neutral" | "info" | "warn" | "ok"): React.CSSProperties {
  const tones = {
    ok: { background: "rgba(16, 185, 129, 0.15)", color: "#0A7A35", borderColor: "#10b981" },
    warn: { background: "rgba(245, 158, 11, 0.15)", color: "#9A5B00", borderColor: "#f59e0b" },
    info: { background: "rgba(59, 130, 246, 0.15)", color: "#1447B2", borderColor: "#3b82f6" },
    neutral: { background: "rgba(148,163,184,.18)", color: "#64748b", borderColor: "rgba(148,163,184,.35)" },
  };
  return (tones as any)[tone] || tones.neutral;
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    padding: "24px 32px",
    position: "relative",
    minHeight: "100vh",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    overflow: "hidden",
    transition: "background 0.3s ease, color 0.3s ease",
  },

  quantumField: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none",
    zIndex: 0,
  },
  quantumParticle: {
    position: "absolute",
    width: "2px",
    height: "2px",
    borderRadius: "50%",
    boxShadow: "0 0 10px currentColor",
    opacity: 0.3,
  },
  ambientLight: {
    position: "fixed",
    width: "600px",
    height: "600px",
    borderRadius: "50%",
    pointerEvents: "none",
    zIndex: 0,
    transition: "transform 0.1s ease",
  },

  header: {
    position: "relative",
    zIndex: 2,
    marginBottom: 32,
  },
  headerGlow: {
    position: "absolute",
    top: "-50%",
    left: "-50%",
    width: "200%",
    height: "200%",
    pointerEvents: "none",
  },

  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  brandIcon: {
    fontSize: 32,
    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
    width: 48,
    height: 48,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 10px 30px rgba(59,130,246,0.3)",
    color: "#fff",
  },
  brandText: { display: "flex", flexDirection: "column" },
  brandName: { fontSize: 18, fontWeight: 700, letterSpacing: "2px" },
  brandVersion: { fontSize: 11 },

  notifications: { display: "flex", alignItems: "center", gap: 14 },
  notificationBell: { position: "relative", fontSize: 24, cursor: "pointer" },
  notificationBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    background: "#ef4444",
    color: "#fff",
    fontSize: 11,
    padding: "2px 5px",
    borderRadius: 10,
    minWidth: 18,
    textAlign: "center",
  },
  userProfile: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid",
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 600,
    color: "#fff",
  },
  userInfo: { display: "flex", flexDirection: "column" },
  userName: { fontSize: 13, fontWeight: 600 },
  userRole: { fontSize: 11 },

  headerContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 24,
    gap: 16,
    flexWrap: "wrap",
  },
  titleSection: {},
  h1: { margin: 0, fontSize: 42, fontWeight: 800, display: "flex", gap: 10, flexWrap: "wrap" },
  h1Glitch: { textShadow: "2px 2px 0 #3b82f6, -2px -2px 0 #8b5cf6" },
  h1Gradient: {
    background: "linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  dateTime: { marginTop: 8, display: "flex", gap: 12, fontSize: 13, flexWrap: "wrap" },

  headerActions: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" },

  periodSelector: {
    display: "flex",
    gap: 4,
    padding: 4,
    borderRadius: 12,
    border: "1px solid",
  },
  periodButton: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: "transparent",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  viewSelector: {
    display: "flex",
    gap: 4,
    padding: 4,
    borderRadius: 12,
    border: "1px solid",
  },
  viewButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: "none",
    background: "transparent",
    fontSize: 18,
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  refreshButton: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "0 16px",
    height: 44,
    borderRadius: 12,
    border: "1px solid",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  refreshIcon: { display: "inline-block" },
  refreshText: { letterSpacing: "1px", fontWeight: 700 },

  // ✅ Theme toggle
  themeToggle: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    height: 44,
    padding: "0 12px",
    borderRadius: 12,
    border: "1px solid",
    cursor: "pointer",
    fontWeight: 800,
    letterSpacing: "1px",
  },
  themeIcon: { fontSize: 16 },
  themeText: { fontSize: 12 },

  quickMetrics: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    border: "1px solid",
  },
  metric: { display: "flex", flexDirection: "column", gap: 4 },
  metricLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontWeight: 600,
  },
  metricValue: { fontSize: 18, fontWeight: 800 },
  metricBar: {
    height: 4,
    background: "rgba(148,163,184,0.20)",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 4,
  },
  metricFill: { height: "100%", background: "linear-gradient(90deg, #3b82f6, #8b5cf6)", borderRadius: 2 },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 20,
    marginBottom: 32,
    position: "relative",
    zIndex: 2,
  },
  statCard: {
    position: "relative",
    backdropFilter: "blur(10px)",
    borderRadius: 24,
    padding: 20,
    border: "1px solid",
    boxShadow: "0 20px 40px -15px rgba(0,0,0,0.5)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    overflow: "hidden",
    cursor: "pointer",
  },
  statCardGlow: {
    position: "absolute",
    top: "-50%",
    left: "-50%",
    width: "200%",
    height: "200%",
    background: "radial-gradient(circle at 50% 50%, rgba(59,130,246,0.10), transparent 70%)",
    opacity: 0,
    transition: "opacity 0.3s ease",
    pointerEvents: "none",
  },
  statCardHologram: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.03) 50%, transparent 70%)",
    transform: "translateX(-100%)",
    transition: "transform 0.5s ease",
    pointerEvents: "none",
  },
  statHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  statIcon: { fontSize: 28 },
  statBadgeContainer: { display: "flex", gap: 8 },
  statBadge: { fontSize: 11, padding: "4px 8px", borderRadius: 12, border: "1px solid", fontWeight: 600 },
  statValue: { fontSize: 36, fontWeight: 900, lineHeight: 1.2, marginBottom: 4 },
  statLabel: { fontSize: 14, marginBottom: 16, fontWeight: 500 },
  statTrend: { fontSize: 12, fontWeight: 700, marginBottom: 12 },
  statFooter: { fontSize: 11, cursor: "pointer" },

  mainGrid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 2fr 1.2fr",
    gap: 20,
    position: "relative",
    zIndex: 2,
  },
  leftColumn: { display: "flex", flexDirection: "column", gap: 20 },
  centerColumn: { display: "flex", flexDirection: "column" },
  rightColumn: { display: "flex", flexDirection: "column", gap: 20 },

  section: {
    backdropFilter: "blur(10px)",
    borderRadius: 24,
    padding: 20,
    border: "1px solid",
  },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 10 },
  sectionTitle: { display: "flex", alignItems: "center", gap: 8 },
  sectionIcon: { fontSize: 20 },

  liveBadge: {
    padding: "4px 8px",
    background: "#ef4444",
    color: "#fff",
    fontSize: 10,
    fontWeight: 800,
    borderRadius: 12,
    animation: "pulse 2s infinite",
  },

  activityFeed: { display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 },
  activityItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "8px 0",
    borderBottom: "1px solid",
  },
  activityAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 800,
    color: "#fff",
  },
  activityContent: { flex: 1 },
  activityAction: { fontSize: 13, marginBottom: 2, fontWeight: 600 },
  activityMeta: { fontSize: 11, display: "flex", gap: 4, flexWrap: "wrap", fontWeight: 500 },
  activityTime: {},
  activityStatus: { width: 8, height: 8, borderRadius: "50%", border: "2px solid" },

  viewAllButton: {
    width: "100%",
    padding: "10px",
    background: "transparent",
    border: "1px solid",
    borderRadius: 12,
    fontSize: 12,
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontWeight: 600,
  },

  actionsGrid: { display: "flex", flexDirection: "column", gap: 8 },
  actionCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 12,
    border: "1px solid",
    borderRadius: 16,
    cursor: "pointer",
    transition: "all 0.2s ease",
    width: "100%",
  },
  actionIcon: { fontSize: 24 },
  actionInfo: { flex: 1, textAlign: "left" },
  actionLabel: { fontSize: 13, fontWeight: 800, display: "block", marginBottom: 2 },
  actionDesc: { fontSize: 11 },
  actionShortcut: {
    fontSize: 11,
    padding: "4px 6px",
    background: "rgba(0,0,0,0.05)",
    borderRadius: 6,
    fontWeight: 600,
  },

  tableContainer: { overflowX: "auto", marginBottom: 16 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    textAlign: "left",
    padding: "12px 8px",
    fontWeight: 700,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    borderBottom: "1px solid",
  },
  tableRow: { transition: "background 0.2s ease" },
  td: { padding: "12px 8px", borderBottom: "1px solid" },
  folio: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: "#3b82f6",
    background: "rgba(59,130,246,0.12)",
    padding: "4px 6px",
    borderRadius: 6,
    fontWeight: 600,
  },
  chapterTitle: { fontSize: 13, fontWeight: 700, marginBottom: 2 },
  chapterBook: { fontSize: 11, fontWeight: 500 },

  statusPill: { display: "inline-block", padding: "4px 8px", borderRadius: 12, fontSize: 11, border: "1px solid", fontWeight: 600 },
  priorityBadge: { display: "inline-block", padding: "2px 6px", borderRadius: 6, fontSize: 10, fontWeight: 700 },
  commentCount: { fontSize: 11, fontWeight: 500 },

  tableAction: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "6px 10px",
    border: "1px solid",
    borderRadius: 10,
    fontSize: 11,
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontWeight: 600,
  },
  actionArrow: { transition: "transform 0.2s ease" },

  tableFilters: { display: "flex", gap: 8, alignItems: "center" },
  filterSelect: {
    padding: "6px 10px",
    border: "1px solid",
    borderRadius: 10,
    fontSize: 11,
    outline: "none",
    fontWeight: 500,
  },
  filterButton: {
    width: 32,
    height: 32,
    border: "1px solid",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  tableFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, fontWeight: 500 },
  pagination: { display: "flex", gap: 4 },
  pageButton: {
    width: 28,
    height: 28,
    border: "1px solid",
    borderRadius: 8,
    fontSize: 11,
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontWeight: 600,
  },
  pageButtonActive: { background: "#3b82f6", color: "#fff", borderColor: "#3b82f6" },

  // Loading
  loadingContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 30,
  },
  loadingCube: { position: "relative", width: 80, height: 80, transformStyle: "preserve-3d", animation: "cubeRotate 3s infinite linear" },
  cube1: { position: "absolute", width: "100%", height: "100%", border: "2px solid", transform: "rotateY(0deg) translateZ(40px)" },
  cube2: { position: "absolute", width: "100%", height: "100%", border: "2px solid", transform: "rotateX(90deg) translateZ(40px)" },
  cube3: { position: "absolute", width: "100%", height: "100%", border: "2px solid", transform: "rotateY(90deg) translateZ(40px)" },
  loadingText: { fontSize: 18, letterSpacing: "2px" },
  loadingProgress: { width: 200, height: 2, background: "rgba(148,163,184,0.20)", borderRadius: 1, overflow: "hidden" },
  progressBar: { width: "60%", height: "100%", background: "linear-gradient(90deg, #3b82f6, #8b5cf6)", animation: "progress 2s ease infinite" },

  // Error
  errorContainer: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, position: "relative" },
  errorGlitch: { fontSize: 72, fontWeight: 800, position: "relative", animation: "glitch 3s infinite" },
  errorIcon: { fontSize: 48 },
  errorTitle: { fontSize: 24, fontWeight: 600 },
  errorMessage: { fontSize: 14, maxWidth: 400, textAlign: "center" },
  retryButton: { position: "relative", padding: "16px 32px", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", border: "none", borderRadius: 30, color: "#fff", fontSize: 14, fontWeight: 800, letterSpacing: "2px", cursor: "pointer", overflow: "hidden", marginTop: 20 },
};

const CSS_GLOBAL = `
  /* =========================
     THEME VARIABLES
  ========================== */
  .dash[data-theme="dark"]{
    --bg:#0a0a0f;
    --text:#ffffff;
    --muted:#94a3b8;
    --card:rgba(255,255,255,0.03);
    --card2:rgba(255,255,255,0.02);
    --border:rgba(255,255,255,0.10);
    --border2:rgba(255,255,255,0.06);
  }
  .dash[data-theme="light"]{
    --bg:#f7f8fb;
    --text:#000000;
    --muted:#475569;
    --card:#ffffff;
    --card2:#ffffff;
    --border:rgba(0,0,0,0.12);
    --border2:rgba(0,0,0,0.08);
  }

  /* ✅ LO QUE PEDISTE: en modo oscuro, el submenu del select (options) con TEXTO NEGRO */
  .dash[data-theme="dark"] select,
  .dash[data-theme="dark"] select option,
  .dash[data-theme="dark"] select optgroup{
    color:#000 !important;
    background:#fff !important;
  }

  /* Encabezados internos */
  .sectionTitle h3{
    margin:0;
    font-size:16px;
    font-weight:800;
    color: var(--text);
  }

  /* Hover effects */
  .statCard:hover .statCardGlow{ opacity:1; }
  .statCard:hover .statCardHologram{ transform: translateX(100%); }

  .actionCard:hover{
    transform: translateX(5px);
    background: rgba(59,130,246,0.10);
    border-color: #3b82f6;
  }

  .tableRow:hover{ background: rgba(0,0,0,0.02); }
  .dash[data-theme="dark"] .tableRow:hover{ background: rgba(255,255,255,0.03); }

  .tableAction:hover{
    background:#3b82f6;
    border-color:#3b82f6;
    color:#fff;
  }
  .tableAction:hover .actionArrow{ transform: translateX(3px); }

  .viewAllButton:hover{
    background: rgba(59,130,246,0.10);
    border-color:#3b82f6;
    color: var(--text);
  }

  .refreshButton:hover{
    background: rgba(59,130,246,0.10);
    border-color:#3b82f6;
  }
  .refreshButton:hover .refreshIcon{ animation: spin 1s linear infinite; }

  .periodButton:hover{
    background: rgba(59,130,246,0.10);
    color: var(--text);
  }

  .viewButton:hover{
    background: rgba(59,130,246,0.10);
    color: var(--text);
  }

  .pageButton:hover{
    background: rgba(59,130,246,0.10);
    border-color:#3b82f6;
  }

  .themeToggle:hover{
    background: rgba(59,130,246,0.10);
    border-color:#3b82f6;
  }

  /* Animations */
  @keyframes quantumFloat {
    0% { transform: translate(0, 0) scale(1); opacity: 0; }
    10% { opacity: 0.3; }
    90% { opacity: 0.3; }
    100% { transform: translate(-80px, 80px) scale(0); opacity: 0; }
  }

  @keyframes cubeRotate {
    0% { transform: rotateX(0deg) rotateY(0deg); }
    100% { transform: rotateX(360deg) rotateY(360deg); }
  }

  @keyframes progress {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(200%); }
  }

  @keyframes glitch {
    0%, 100% { transform: translate(0); }
    20% { transform: translate(-5px, 5px); }
    40% { transform: translate(5px, -5px); }
    60% { transform: translate(-5px, -5px); }
    80% { transform: translate(5px, 5px); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Responsive */
  @media (max-width: 1200px){
    .statsGrid { grid-template-columns: repeat(3, 1fr) !important; }
    .mainGrid { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 900px){
    .statsGrid { grid-template-columns: repeat(2, 1fr) !important; }
    .quickMetrics { grid-template-columns: repeat(2, 1fr) !important; }
  }
  @media (max-width: 600px){
    .statsGrid { grid-template-columns: 1fr !important; }
    .quickMetrics { grid-template-columns: 1fr !important; }
    .headerTop { flex-direction: column; align-items: flex-start; }
    .notifications { width: 100%; justify-content: space-between; }
  }
`;