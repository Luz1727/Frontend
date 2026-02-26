// src/pages/Dashboard.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getDashboardSummary, DashboardSummary } from "../services/dashboard";
import styles from "./Dashboard.module.css";

type Stat = {
  label: string;
  value: number;
  hint: string;
  tone: "neutral" | "info" | "warn" | "ok";
  icon: string;
  trend?: number;
};

type ThemeMode = "dark" | "light";

/** =========================
 *  🔒 Clock helpers (12h fijo)
 *  ========================= */
function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// 🔒 12 HORAS FIJO (NO depende del navegador)
function formatTime12h(d: Date) {
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const seconds = d.getSeconds();

  const ampm = hours >= 12 ? "pm" : "am";
  const h12 = hours % 12 === 0 ? 12 : hours % 12;

  return `${pad2(h12)}:${pad2(minutes)}:${pad2(seconds)} ${ampm}`;
}

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

  /** ✅ Reloj con strings (evita toggles/formatos raros en Edge) */
  const [dateText, setDateText] = useState("");
  const [timeText, setTimeText] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);

  // refs para limpiar correctamente
  const clockTimeoutRef = useRef<number | null>(null);
  const clockIntervalRef = useRef<number | null>(null);

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

  // ===== Clock tick (alineado al segundo + 12h fijo) =====
  useEffect(() => {
    const tick = () => {
      const d = new Date();

      setDateText(
        d.toLocaleDateString("es-MX", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );

      // 🔒 SIEMPRE 12h, nunca 24h
      setTimeText(formatTime12h(d));
    };

    tick();

    const msToNextSecond = 1000 - new Date().getMilliseconds();

    clockTimeoutRef.current = window.setTimeout(() => {
      tick();
      clockIntervalRef.current = window.setInterval(tick, 1000);
    }, msToNextSecond);

    return () => {
      if (clockTimeoutRef.current) window.clearTimeout(clockTimeoutRef.current);
      if (clockIntervalRef.current) window.clearInterval(clockIntervalRef.current);
      clockTimeoutRef.current = null;
      clockIntervalRef.current = null;
    };
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

  const getBadgeClass = (tone: "neutral" | "info" | "warn" | "ok"): string => {
    const baseClass = styles.statBadge;
    const map = {
      ok: styles.badgeOk,
      warn: styles.badgeWarn,
      info: styles.badgeInfo,
      neutral: styles.badgeNeutral,
    };
    return `${baseClass} ${map[tone]}`;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer} data-theme={theme}>
        <div className={styles.loadingCube}>
          <div className={styles.cube1} />
          <div className={styles.cube2} />
          <div className={styles.cube3} />
        </div>
        <div className={styles.loadingText}>Inicializando dashboard cuántico...</div>
        <div className={styles.loadingProgress}>
          <div className={styles.progressBar} />
        </div>
      </div>
    );
  }

  if (errMsg) {
    return (
      <div className={styles.errorContainer} data-theme={theme}>
        <div className={styles.errorGlitch} data-text="ERROR">
          ERROR
        </div>
        <div className={styles.errorIcon}>⚠️</div>
        <div className={styles.errorTitle}>Falla en la matrix</div>
        <div className={styles.errorMessage}>{errMsg}</div>
        <button className={styles.retryButton} onClick={() => window.location.reload()} type="button">
          REINICIAR SISTEMA
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={styles.wrap} data-theme={theme}>
      {/* Fondo cuántico */}
      <div className={styles.quantumField} aria-hidden>
        {particles.map((p) => (
          <div
            key={p.i}
            className={styles.quantumParticle}
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
              background: `hsl(${p.hue}, 80%, 60%)`,
            }}
          />
        ))}
      </div>

      {/* Luz ambiental */}
      <div
        className={styles.ambientLight}
        style={{
          transform: `translate(${mousePosition.x * 30}px, ${mousePosition.y * 30}px)`,
        }}
        aria-hidden
      />

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerGlow} aria-hidden />

        <div className={styles.headerTop}>
          <div className={styles.brand}>
            <div className={styles.brandIcon}>⚡</div>
            <div className={styles.brandText}>
              <span className={styles.brandName}>EDITORIAL</span>
              <span className={styles.brandVersion}>NEXUS v3.0</span>
            </div>
          </div>

          <div className={styles.notifications}>
            <button
              type="button"
              className={styles.themeToggle}
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
            >
              <span className={styles.themeIcon} aria-hidden>
                {theme === "dark" ? "☀️" : "🌙"}
              </span>
              <span className={styles.themeText}>{theme === "dark" ? "CLARO" : "OSCURO"}</span>
            </button>

            <div className={styles.notificationBell}>
              🔔
              {notifications > 0 && <span className={styles.notificationBadge}>{notifications}</span>}
            </div>

            <div className={styles.userProfile}>
              <div className={styles.userAvatar}>AD</div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>Admin Dios</span>
                <span className={styles.userRole}>Editorial Supreme</span>
              </div>
            </div>
          </div>
        </div>
        <div style={styles.headerContent}>
          <div style={styles.titleSection}>
            <h1 style={styles.h1}>
              <span style={{ ...styles.h1Glitch, color: themeColors.text }}>DASHBOARD</span>
              
            </h1>

            {/* ✅ RELOJ 12H FIJO */}
            <div className={styles.dateTime}>
              <span>{dateText}</span>
              <span> • </span>
              <span className={styles.time}>{timeText}</span>
            </div>
          </div>

          <div className={styles.headerActions}>
            <div className={styles.periodSelector}>
              {(["hoy", "semana", "mes", "año"] as const).map((period) => (
                <button
                  key={period}
                  className={styles.periodButton}
                  data-active={selectedPeriod === period ? "1" : "0"}
                  onClick={() => setSelectedPeriod(period)}
                  type="button"
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>

            <div className={styles.viewSelector}>
              <button
                className={styles.viewButton}
                data-active={selectedView === "grid" ? "1" : "0"}
                onClick={() => setSelectedView("grid")}
                type="button"
                aria-label="Vista grid"
              >
                ⊞
              </button>
              <button
                className={styles.viewButton}
                data-active={selectedView === "list" ? "1" : "0"}
                onClick={() => setSelectedView("list")}
                type="button"
                aria-label="Vista lista"
              >
                ≡
              </button>
              <button
                className={styles.viewButton}
                data-active={selectedView === "chart" ? "1" : "0"}
                onClick={() => setSelectedView("chart")}
                type="button"
                aria-label="Vista chart"
              >
                📊
              </button>
            </div>

            <button className={styles.refreshButton} onClick={() => window.location.reload()} type="button">
              <span className={styles.refreshIcon}>⟳</span>
              <span className={styles.refreshText}>SINCRONIZAR</span>
            </button>
          </div>
        </div>

        {/* Métricas rápidas */}
        <div className={styles.quickMetrics}>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Eficiencia</span>
            <span className={styles.metricValue}>{performanceMetrics.eficiencia}%</span>
            <div className={styles.metricBar}>
              <div className={styles.metricFill} style={{ width: `${performanceMetrics.eficiencia}%` }} />
            </div>
          </div>

          <div className={styles.metric}>
            <span className={styles.metricLabel}>Tiempo promedio</span>
            <span className={styles.metricValue}>{performanceMetrics.tiempoPromedio}</span>
          </div>

          <div className={styles.metric}>
            <span className={styles.metricLabel}>Satisfacción</span>
            <span className={styles.metricValue}>{performanceMetrics.satisfaccion}%</span>
            <div className={styles.metricBar}>
              <div className={styles.metricFill} style={{ width: `${performanceMetrics.satisfaccion}%` }} />
            </div>
          </div>

          <div className={styles.metric}>
            <span className={styles.metricLabel}>Productividad</span>
            <span className={styles.metricValue}>{performanceMetrics.productividad}%</span>
            <div className={styles.metricBar}>
              <div className={styles.metricFill} style={{ width: `${performanceMetrics.productividad}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        {stats.map((s) => (
          <div
            key={s.label}
            className={styles.statCard}
            style={{
              transform: `perspective(1000px) rotateX(${mousePosition.y * 5}deg) rotateY(${mousePosition.x * 5}deg) scale(${
                hoveredCard === s.label ? 1.05 : 1
              })`,
              zIndex: hoveredCard === s.label ? 10 : 1,
            }}
            onMouseEnter={() => setHoveredCard(s.label)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className={styles.statCardGlow} />
            <div className={styles.statCardHologram} />

            <div className={styles.statHeader}>
              <span className={styles.statIcon}>{s.icon}</span>
              <div className={styles.statBadgeContainer}>
                <span className={getBadgeClass(s.tone)}>{s.hint}</span>
              </div>
            </div>

            <div className={styles.statValue}>{s.value.toLocaleString()}</div>
            <div className={styles.statLabel}>{s.label}</div>

            {s.trend !== undefined && (
              <div className={styles.statTrend} data-trend={s.trend > 0 ? "up" : s.trend < 0 ? "down" : "flat"}>
                {s.trend > 0 ? "▲" : s.trend < 0 ? "▼" : "◆"} {Math.abs(s.trend)}% vs período anterior
              </div>
            )}

            <div className={styles.statFooter}>
              <span>Ver detalles →</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className={styles.mainGrid}>
        {/* Left */}
        <div className={styles.leftColumn}>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>⚡</span>
                <h3>Actividad en tiempo real</h3>
              </div>
              <span className={styles.liveBadge}>LIVE</span>
            </div>

            <div className={styles.activityFeed}>
              {realtimeActivity.map((activity, i) => {
                const badgeClass =
                  activity.status === "info"
                    ? styles.badgeInfo
                    : activity.status === "warn"
                    ? styles.badgeWarn
                    : activity.status === "ok"
                    ? styles.badgeOk
                    : styles.badgeNeutral;

                return (
                  <div key={i} className={styles.activityItem}>
                    <div className={styles.activityAvatar}>{activity.avatar}</div>
                    <div className={styles.activityContent}>
                      <div className={styles.activityAction}>{activity.action}</div>
                      <div className={styles.activityMeta}>
                        <span>{activity.user}</span>
                        <span className={styles.activityTime}>• {activity.time}</span>
                      </div>
                    </div>
                    <div className={`${styles.activityStatus} ${badgeClass}`} />
                  </div>
                );
              })}
            </div>

            <button className={styles.viewAllButton} type="button">
              Ver toda la actividad →
            </button>
          </div>
        </div>

        {/* Center */}
        <div className={styles.centerColumn}>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>📋</span>
                <h3>Capítulos pendientes</h3>
              </div>

              <div className={styles.tableFilters}>
                <select className={styles.filterSelect} defaultValue="all">
                  <option value="all">Todos los estados</option>
                  <option value="alta">Alta prioridad</option>
                  <option value="revision">En revisión</option>
                  <option value="correcciones">Correcciones</option>
                </select>
                <button className={styles.filterButton} type="button" aria-label="Buscar">
                  🔍
                </button>
              </div>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Folio</th>
                    <th className={styles.th}>Capítulo</th>
                    <th className={styles.th}>Autor</th>
                    <th className={styles.th}>Estado</th>
                    <th className={styles.th}>Prioridad</th>
                    <th className={styles.th}>Comentarios</th>
                    <th className={styles.th}>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {pendingChapters.map((chapter, i) => {
                    const statusClass =
                      chapter.status === "info"
                        ? styles.badgeInfo
                        : chapter.status === "warn"
                        ? styles.badgeWarn
                        : chapter.status === "ok"
                        ? styles.badgeOk
                        : styles.badgeNeutral;

                    return (
                      <tr key={i} className={styles.tableRow}>
                        <td className={styles.td} data-label="Folio">
                          <span className={styles.folio}>{chapter.id}</span>
                        </td>

                        <td className={styles.td} data-label="Capítulo">
                          <div className={styles.chapterTitle}>{chapter.title}</div>
                          <div className={styles.chapterBook}>{chapter.book}</div>
                        </td>

                        <td className={styles.td} data-label="Autor">{chapter.author}</td>

                        <td className={styles.td} data-label="Estado">
                          <span className={`${styles.statusPill} ${statusClass}`}>{chapter.statusText}</span>
                        </td>

                        <td className={styles.td} data-label="Prioridad">
                          <span className={styles.priorityBadge} data-priority={chapter.priority}>
                            {chapter.priority}
                          </span>
                        </td>

                        <td className={styles.td} data-label="Comentarios">
                          <span className={styles.commentCount}>💬 {chapter.comments}</span>
                        </td>

                        <td className={styles.td} data-label="Acción">
                          <button className={styles.tableAction} type="button">
                            <span>Ver</span>
                            <span className={styles.actionArrow}>→</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.tableFooter}>
              <span>Mostrando 4 de 12 capítulos</span>
              <div className={styles.pagination}>
                <button className={styles.pageButton} type="button">←</button>
                <button className={`${styles.pageButton} ${styles.pageButtonActive}`} type="button">1</button>
                <button className={styles.pageButton} type="button">2</button>
                <button className={styles.pageButton} type="button">3</button>
                <button className={styles.pageButton} type="button">→</button>
              </div>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className={styles.rightColumn}>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>⚡</span>
                <h3>Acciones rápidas</h3>
              </div>
            </div>

            <div className={styles.actionsGrid}>
              <button className={styles.actionCard} type="button">
                <span className={styles.actionIcon}>📚</span>
                <div className={styles.actionInfo}>
                  <span className={styles.actionLabel}>Crear libro</span>
                  <span className={styles.actionDesc}>Nuevo proyecto editorial</span>
                </div>
                <span className={styles.actionShortcut}>⌘N</span>
              </button>

              <button className={styles.actionCard} type="button">
                <span className={styles.actionIcon}>⚖️</span>
                <div className={styles.actionInfo}>
                  <span className={styles.actionLabel}>Asignar dictaminador</span>
                  <span className={styles.actionDesc}>Seleccionar evaluador</span>
                </div>
                <span className={styles.actionShortcut}>⌘D</span>
              </button>

              <button className={styles.actionCard} type="button">
                <span className={styles.actionIcon}>📜</span>
                <div className={styles.actionInfo}>
                  <span className={styles.actionLabel}>Generar constancias</span>
                  <span className={styles.actionDesc}>Emitir documentos</span>
                </div>
                <span className={styles.actionShortcut}>⌘G</span>
              </button>

              <button className={styles.actionCard} type="button">
                <span className={styles.actionIcon}>📊</span>
                <div className={styles.actionInfo}>
                  <span className={styles.actionLabel}>Exportar reporte</span>
                  <span className={styles.actionDesc}>PDF o Excel</span>
                </div>
                <span className={styles.actionShortcut}>⌘E</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}