import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api";
import styles from './Usuarios.module.css';

type Role = "editorial" | "dictaminador" | "autor";

type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  institution?: string;
  cvoSnii?: string;
  active: boolean;
  createdAt: string;
  signatureUrl?: string | null;
};

type ApiUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  institution?: string | null;
  cvo_snii?: string | null;
  active: number | boolean;
  created_at: string;
  signature_url?: string | null;
};

function mapApiUser(u: ApiUser): User {
  return {
    id: String(u.id),
    name: u.name,
    email: u.email,
    role: u.role,
    institution: u.institution ?? undefined,
    cvoSnii: u.cvo_snii ?? undefined,
    active: typeof u.active === "number" ? u.active === 1 : Boolean(u.active),
    createdAt: u.created_at,
    signatureUrl: u.signature_url ?? null,
  };
}

function fmtDate(dateStr: string) {
  if (!dateStr) return "—";
  const pure = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const [y, m, d] = pure.split("-");
  if (!d) return dateStr;
  return `${d}/${m}/${y}`;
}

// ✅ Funciones para obtener clases de pills
function getRolePillClass(role: Role): string {
  const baseClass = styles.pill;
  
  if (role === "editorial") return `${baseClass} ${styles.pillEditorial}`;
  if (role === "dictaminador") return `${baseClass} ${styles.pillDictaminador}`;
  return `${baseClass} ${styles.pillAutor}`;
}

function getActivePillClass(active: boolean): string {
  const baseClass = styles.pill;
  
  if (active) return `${baseClass} ${styles.pillActive}`;
  return `${baseClass} ${styles.pillInactive}`;
}

function canvasHasInk(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < img.data.length; i += 4) {
    if (img.data[i] !== 0) return true;
  }
  return false;
}

function fileFromCanvas(canvas: HTMLCanvasElement, filename = "signature.png"): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("No se pudo convertir el canvas a imagen"));
        resolve(new File([blob], filename, { type: "image/png" }));
      },
      "image/png",
      1
    );
  });
}

export default function Usuarios() {
  const [tab, setTab] = useState<"DICTAMINADORES" | "AUTORES">("DICTAMINADORES");
  const roleForTab: Role = tab === "DICTAMINADORES" ? "dictaminador" : "autor";

  const [users, setUsers] = useState<User[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filtered = useMemo(() => users.filter((u) => u.role === roleForTab), [users, roleForTab]);

  // Form alta
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [institution, setInstitution] = useState("");
  const [cvoSnii, setCvoSnii] = useState("");

  // Firma: selección de dictaminador
  const dictaminadores = useMemo(() => users.filter((u) => u.role === "dictaminador"), [users]);
  const [selectedDictId, setSelectedDictId] = useState<string>("");

  const selectedDict = useMemo(
    () => dictaminadores.find((u) => u.id === selectedDictId) ?? null,
    [dictaminadores, selectedDictId]
  );

  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Canvas firma
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const startDraw = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawingRef.current = true;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const moveDraw = (x: number, y: number) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    drawingRef.current = false;
  };

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("clientX" in e) {
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    const t = e.touches[0];
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  };

  // ---------------- API ----------------
  const fetchUsersForRole = async (role: Role) => {
    const { data } = await api.get<ApiUser[]>("/admin/users", { params: { role } });
    return data.map(mapApiUser);
  };

  const fetchUsers = async () => {
    setErrorMsg(null);
    setLoadingList(true);
    try {
      const main = await fetchUsersForRole(roleForTab);
      const extra = roleForTab === "autor" ? await fetchUsersForRole("dictaminador") : [];
      const merged = [...main, ...extra];

      const map = new Map<string, User>();
      for (const u of merged) map.set(u.id, u);

      setUsers(Array.from(map.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? "No se pudieron cargar los usuarios.";
      setErrorMsg(msg);
    } finally {
      setLoadingList(false);
    }
  };

  const fetchSignatureFor = async (userId: string) => {
    setSignaturePreview(null);
    try {
      const { data } = await api.get<{ signature_url: string | null }>(`/admin/users/${userId}/signature`);
      setSignaturePreview(data.signature_url ?? null);
    } catch {
      setSignaturePreview(null);
    }
  };

  const uploadSignatureFor = async (userId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);

    setSavingSignature(true);
    try {
      const { data } = await api.post<{ signature_url: string }>(`/admin/users/${userId}/signature`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSignaturePreview(data.signature_url);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, signatureUrl: data.signature_url } : u)));
      alert("Firma guardada para este dictaminador.");
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? "No se pudo subir la firma.";
      alert(msg);
    } finally {
      setSavingSignature(false);
    }
  };

  // ---------------- EFECTOS ----------------
  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (!selectedDictId && dictaminadores.length > 0) {
      setSelectedDictId(dictaminadores[0].id);
    }
  }, [dictaminadores, selectedDictId]);

  useEffect(() => {
    if (selectedDictId) fetchSignatureFor(selectedDictId);
    else setSignaturePreview(null);

    clearCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDictId]);

  // ---------------- ACCIONES ----------------
  const addUser = async () => {
    setErrorMsg(null);

    const role: Role = roleForTab;

    if (!name.trim() || !email.trim()) {
      alert("Nombre y correo son obligatorios.");
      return;
    }

    if (role === "dictaminador" && !cvoSnii.trim()) {
      alert("Para dictaminador, CVU/SNII es obligatorio (será su contraseña).");
      return;
    }

    setSavingUser(true);
    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        institution: role === "dictaminador" ? (institution.trim() ? institution.trim() : null) : null,
        cvo_snii: role === "dictaminador" ? (cvoSnii.trim() ? cvoSnii.trim() : null) : null,
      };

      const { data } = await api.post<ApiUser>("/admin/users", payload);
      const created = mapApiUser(data);

      setUsers((prev) => [created, ...prev]);

      setName("");
      setEmail("");
      setInstitution("");
      setCvoSnii("");

      if (role === "dictaminador") {
        alert(`Dictaminador creado.\n\nInicio de sesión:\nCorreo: ${created.email}\nContraseña: (su CVU/SNII)`);
      } else {
        alert(`Autor creado.\n\nInicio de sesión:\nCorreo: ${created.email}\nContraseña: (su nombre)`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? "No se pudo crear el usuario.";
      alert(msg);
    } finally {
      setSavingUser(false);
    }
  };

  const toggleActive = async (id: string) => {
    const current = users.find((u) => u.id === id);
    if (!current) return;

    try {
      const newActive = !current.active;
      const { data } = await api.patch<ApiUser>(`/admin/users/${id}`, { active: newActive ? 1 : 0 });
      const updated = mapApiUser(data);
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? "No se pudo actualizar el estado.";
      alert(msg);
    }
  };

  const deleteUser = async (u: User) => {
    if (u.role === "editorial") {
      alert("No puedes eliminar un usuario editorial.");
      return;
    }

    const ok = confirm(`¿Eliminar a "${u.name}" (${u.email})?\n\nEsta acción NO se puede deshacer.`);
    if (!ok) return;

    try {
      await api.delete(`/admin/users/${u.id}`);

      setUsers((prev) => prev.filter((x) => x.id !== u.id));

      if (selectedDictId === u.id) {
        setSelectedDictId("");
        setSignaturePreview(null);
        clearCanvas();
      }

      alert("Usuario eliminado.");
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? "No se pudo eliminar el usuario.";
      alert(msg);
    }
  };

  const editUser = (u: User) => {
    alert(`Después: modal editar usuario\n\n${u.name} (${u.role})`);
  };

  // ---------------- FIRMA (DICTAMINADOR) ----------------
  const onSelectDictaminador = (id: string) => setSelectedDictId(id);

  const onUploadSignatureImage = async (file: File | null) => {
    if (!selectedDictId) {
      alert("Selecciona un dictaminador.");
      return;
    }
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Sube una imagen (PNG/JPG).");
      return;
    }

    await uploadSignatureFor(selectedDictId, file);
  };

  const openFilePicker = () => {
    if (!selectedDictId) {
      alert("Selecciona un dictaminador.");
      return;
    }
    if (savingSignature) return;
    fileInputRef.current?.click();
  };

  const saveCanvasAsSignature = async () => {
    if (!selectedDict) {
      alert("Selecciona un dictaminador.");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!canvasHasInk(canvas)) {
      alert("Dibuja la firma antes de guardar.");
      return;
    }

    try {
      const file = await fileFromCanvas(canvas, `firma_dict_${selectedDict.id}.png`);
      await uploadSignatureFor(selectedDict.id, file);
    } catch (e: any) {
      alert(e?.message ?? "No se pudo guardar la firma del canvas.");
    }
  };

  const clearSignature = () => {
    setSignaturePreview(null);
    clearCanvas();
    alert("Firma eliminada (solo UI). Si quieres, agregamos DELETE en backend.");
  };

  const showExtraCols = tab === "DICTAMINADORES";

  // ---------------- UI ----------------
  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <div>
          <h2 className={styles.h2}>Usuarios y roles</h2>
          <p className={styles.p}>Gestión de dictaminadores y autores. (solo editorial/admin)</p>
          {errorMsg && <div className={styles.error} style={{ marginTop: 8 }}>{errorMsg}</div>}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#6B7280" }}>{loadingList ? "Cargando..." : "Actualizado"}</span>
          <button className={styles.linkBtn} type="button" onClick={fetchUsers} disabled={loadingList}>
            Recargar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tabBtn} ${tab === "DICTAMINADORES" ? styles.tabActive : ""}`}
          onClick={() => setTab("DICTAMINADORES")}
        >
          Dictaminadores
        </button>
        <button
          className={`${styles.tabBtn} ${tab === "AUTORES" ? styles.tabActive : ""}`}
          onClick={() => setTab("AUTORES")}
        >
          Autores
        </button>
      </div>

      <div className={styles.grid}>
        {/* Izquierda: Alta + Firma */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Alta */}
          <div className={styles.formCard}>
            <h3 className={styles.h3}>Alta de {tab === "DICTAMINADORES" ? "dictaminadores" : "autores"}</h3>
            <p className={styles.p2}>
              Se crea un usuario con rol <b>{tab === "DICTAMINADORES" ? "dictaminador" : "autor"}</b>.
            </p>

            <div className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Nombre</label>
                <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Correo</label>
                <input
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@dominio.com"
                />
              </div>

              {/* Campos extra SOLO para dictaminador */}
              {tab === "DICTAMINADORES" && (
                <>
                  <div className={styles.field}>
                    <label className={styles.label}>Institución</label>
                    <input
                      className={styles.input}
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="Universidad / Instituto"
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>CVU / SNII</label>
                    <input
                      className={styles.input}
                      value={cvoSnii}
                      onChange={(e) => setCvoSnii(e.target.value)}
                      placeholder="Ej: 123456 (será su contraseña)"
                    />
                  </div>
                </>
              )}

              <button className={styles.primaryBtn} onClick={addUser} disabled={savingUser}>
                {savingUser ? "Guardando..." : "Dar de alta"}
              </button>

              <div className={styles.note}>Dictaminador: contraseña = CVU/SNII. Autor: contraseña = nombre.</div>
            </div>
          </div>

          {/* Firma */}
          <div className={styles.formCard}>
            <h3 className={styles.h3}>Firma (dictaminador)</h3>
            <p className={styles.p2}>
              Guarda la firma del dictaminador para usarla al <b>emitir constancias</b> o <b>cerrar dictámenes</b>.
            </p>

            <div className={styles.field}>
              <label className={styles.label}>Selecciona dictaminador</label>
              <select
                className={styles.input}
                value={selectedDictId}
                onChange={(e) => onSelectDictaminador(e.target.value)}
                disabled={dictaminadores.length === 0}
              >
                {dictaminadores.length === 0 ? (
                  <option value="">No hay dictaminadores</option>
                ) : (
                  dictaminadores.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.id}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className={styles.signatureRow}>
              <div className={styles.signatureBox}>
                <div className={styles.signatureTitle}>Vista previa</div>
                {signaturePreview ? (
                  <img src={signaturePreview} alt="Firma" className={styles.signaturePreview} />
                ) : (
                  <div className={styles.signatureEmpty}>Sin firma guardada</div>
                )}

                <div className={styles.signatureHint}>
                  {savingSignature ? <b>Guardando firma...</b> : <span>Sube PNG/JPG o dibuja y guarda.</span>}
                </div>

                <div className={styles.actions}>
                  <button
                    className={styles.linkBtn}
                    type="button"
                    onClick={() => {
                      if (!selectedDict) return;
                      navigator.clipboard?.writeText(selectedDict.id);
                      alert("ID copiado.");
                    }}
                    disabled={!selectedDict}
                  >
                    Copiar ID
                  </button>

                  <button className={styles.ghostBtn} type="button" onClick={clearSignature} disabled={!selectedDict}>
                    Eliminar firma
                  </button>
                </div>
              </div>

              <div className={styles.signatureBox}>
                <div className={styles.signatureTitle}>Subir imagen de firma</div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    onUploadSignatureImage(file);
                    e.currentTarget.value = "";
                  }}
                />

                <button
                  className={styles.primaryBtn}
                  type="button"
                  onClick={openFilePicker}
                  disabled={!selectedDictId || savingSignature}
                >
                  {savingSignature ? "Subiendo..." : "Seleccionar archivo"}
                </button>

                <div className={styles.signatureHint}>
                  {selectedDictId ? "Recomendado: PNG con fondo transparente." : "Primero selecciona un dictaminador."}
                </div>
              </div>
            </div>

            <div className={styles.canvasWrap}>
              <div className={styles.signatureTitle}>Dibujar firma</div>

              <canvas
                ref={canvasRef}
                width={520}
                height={160}
                className={styles.canvas}
                onMouseDown={(e) => {
                  const p = getPos(e);
                  startDraw(p.x, p.y);
                }}
                onMouseMove={(e) => {
                  const p = getPos(e);
                  moveDraw(p.x, p.y);
                }}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={(e) => {
                  e.preventDefault();
                  const p = getPos(e);
                  startDraw(p.x, p.y);
                }}
                onTouchMove={(e) => {
                  e.preventDefault();
                  const p = getPos(e);
                  moveDraw(p.x, p.y);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  endDraw();
                }}
              />

              <div className={styles.actions}>
                <button className={styles.linkBtn} type="button" onClick={clearCanvas}>
                  Limpiar canvas
                </button>
                <button
                  className={styles.primaryBtn}
                  type="button"
                  onClick={saveCanvasAsSignature}
                  disabled={!selectedDictId || savingSignature}
                >
                  Guardar firma (canvas)
                </button>
              </div>

              <div className={styles.note}>Nota: la firma se guarda en backend y se liga al dictaminador.</div>
            </div>
          </div>
        </div>

        {/* Derecha: Tabla */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div>
              <div className={styles.tableTitle}>{tab === "DICTAMINADORES" ? "Dictaminadores" : "Autores"}</div>
              <div className={styles.tableSub}>{loadingList ? "Cargando..." : `${filtered.length} registros`}</div>
            </div>

            <span className={styles.badge}>online</span>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Nombre</th>
                  <th className={styles.th}>Correo</th>
                  <th className={styles.th}>Rol</th>

                  {showExtraCols && <th className={styles.th}>Institución</th>}
                  {showExtraCols && <th className={styles.th}>CVU/SNII</th>}

                  <th className={styles.th}>Activo</th>
                  <th className={styles.th}>Alta</th>
                  <th className={styles.th}>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td className={styles.td}>
                      <div className={styles.cellTitle}>{u.name}</div>
                      <div className={styles.cellSub}>ID: {u.id}</div>
                    </td>

                    <td className={styles.td}>{u.email}</td>

                    <td className={styles.td}>
                      <span className={getRolePillClass(u.role)}>{u.role}</span>
                    </td>

                    {showExtraCols && <td className={styles.td}>{u.institution ?? "—"}</td>}
                    {showExtraCols && <td className={styles.td}>{u.cvoSnii ?? "—"}</td>}

                    <td className={styles.td}>
                      <span className={getActivePillClass(u.active)}>
                        {u.active ? "Sí" : "No"}
                      </span>
                    </td>

                    <td className={styles.td}>{fmtDate(u.createdAt)}</td>

                    <td className={styles.td}>
                      <div className={styles.actions}>
                        <button className={styles.linkBtn} onClick={() => editUser(u)}>
                          Editar
                        </button>

                        <button className={styles.ghostBtn} onClick={() => toggleActive(u.id)}>
                          {u.active ? "Desactivar" : "Activar"}
                        </button>

                        <button className={styles.dangerBtn} onClick={() => deleteUser(u)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!loadingList && filtered.length === 0 && (
                  <tr>
                    <td className={styles.td} colSpan={showExtraCols ? 8 : 6}>
                      No hay registros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.footerHint}>
            <span className={styles.muted}>
              Roles soportados: <b>editorial</b>, <b>dictaminador</b>, <b>autor</b>.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}