import Swal, { SweetAlertIcon } from "sweetalert2";

type ConfirmOpts = {
  title?: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  icon?: SweetAlertIcon;
};

// ✅ helper: evita warning aria-hidden (blur antes de abrir)
function blurActiveElement() {
  try {
    const el = document.activeElement as HTMLElement | null;
    if (el && typeof el.blur === "function") el.blur();
  } catch {}
}

const base = Swal.mixin({
  toast: false,
  position: "center",
  allowOutsideClick: true,
  allowEscapeKey: true,
  heightAuto: false, // ✅ OK en MODAL
  returnFocus: false, // ✅ OK en MODAL (NO toast)

  customClass: {
    popup: "alert-premium animated fadeInDown",
    title: "alert-title",
    htmlContainer: "alert-text",
    confirmButton: "swal2-confirm-btn-premium",
    cancelButton: "swal2-cancel-btn-premium",
  },

  buttonsStyling: false,
  showConfirmButton: true,
  confirmButtonText: "Aceptar",

  showClass: { popup: "animated fadeInDown faster" },
  hideClass: { popup: "animated fadeOutUp faster" },

  didOpen: () => {
    // ✅ evita foco atrapado en botón detrás del modal
    blurActiveElement();
  },
});

const toast = Swal.mixin({
  toast: true,
  position: "bottom",
  width: "420px",
  padding: "12px 14px",
  showConfirmButton: false,
  timer: 2400,
  timerProgressBar: true,

  // ❌ IMPORTANTÍSIMO: NO pongas returnFocus en toast
  // ❌ NO pongas heightAuto en toast

  customClass: {
    popup: "alert-premium animated fadeIn faster swal-toast-center",
    title: "alert-title",
    htmlContainer: "alert-text",
  },

  buttonsStyling: false,

  didOpen: () => {
    // ✅ por accesibilidad (y evita el warning de aria-hidden/focus)
    blurActiveElement();
  },
});

function fire(icon: SweetAlertIcon, title: string, text?: string) {
  blurActiveElement();
  return base.fire({
    icon,
    title,
    html: text ? `<div>${text}</div>` : undefined,
  });
}

export const alertService = {
  success: (msg: string, title = "Listo") => fire("success", title, msg),
  error: (msg: string, title = "Ups…") => fire("error", title, msg),
  warning: (msg: string, title = "Atención") => fire("warning", title, msg),
  info: (msg: string, title = "Info") => fire("info", title, msg),

  // ✅ BLINDAJE: forzamos que no se meta returnFocus a toast
  toastSuccess: (msg: string) => toast.fire({ icon: "success", title: msg }),
  toastError: (msg: string) => toast.fire({ icon: "error", title: msg }),
  toastWarning: (msg: string) => toast.fire({ icon: "warning", title: msg }),
  toastInfo: (msg: string) => toast.fire({ icon: "info", title: msg }),

  confirm: async (titleOrOpts: string | ConfirmOpts, textMaybe?: string) => {
    Swal.close();
    blurActiveElement();

    const opts: ConfirmOpts =
      typeof titleOrOpts === "string"
        ? { title: titleOrOpts, text: textMaybe }
        : titleOrOpts;

    return base.fire({
      icon: opts.icon ?? "question",
      title: opts.title ?? "¿Confirmas?",
      html: opts.text ? `<div>${opts.text}</div>` : undefined,
      showCancelButton: true,
      confirmButtonText: opts.confirmText ?? "Sí, continuar",
      cancelButtonText: opts.cancelText ?? "Cancelar",

      showClass: { popup: "animated zoomIn faster" },
      hideClass: { popup: "animated zoomOut faster" },

      // ✅ modal ok
      returnFocus: false,
    });
  },

  loading: (title = "Procesando...") => {
    Swal.close();
    blurActiveElement();

    return base.fire({
      title,
      html: `
        <div class="alert-text">Espera un momento…</div>
        <div class="progress-bar-container"><div class="progress-bar"></div></div>
      `,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        blurActiveElement();
        Swal.showLoading();
      },
    });
  },

  close: () => Swal.close(),
};