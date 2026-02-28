import Swal, { SweetAlertIcon } from "sweetalert2";

type ConfirmOpts = {
  title?: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  icon?: SweetAlertIcon;
};

function blurActiveElement() {
  try {
    const el = document.activeElement as HTMLElement | null;
    if (el && typeof el.blur === "function") el.blur();
  } catch {}
}

function getRoot() {
  return document.getElementById("root");
}

/**
 * ✅ INERT: evita que algún input retenga foco mientras Swal intenta
 * aplicar aria-hidden. Esto es lo que te está rompiendo el modal.
 */
function setRootInert(on: boolean) {
  const root = getRoot();
  if (!root) return;

  try {
    if (on) {
      root.setAttribute("inert", "");
      // por si quedó pegado de antes:
      root.removeAttribute("aria-hidden");
      root.removeAttribute("data-previous-aria-hidden");
    } else {
      root.removeAttribute("inert");
      root.removeAttribute("aria-hidden");
      root.removeAttribute("data-previous-aria-hidden");
    }
  } catch {}
}

function hardClose() {
  try {
    Swal.close();
    document.querySelectorAll(".swal2-container").forEach((n) => n.remove());
    document.querySelectorAll(".swal2-backdrop-show, .swal2-backdrop-hide").forEach((n) => n.remove());

    document.body.classList.remove("swal2-shown", "swal2-height-auto", "swal2-no-backdrop");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("padding-right");
  } catch {}

  // ✅ deja la app “normal” siempre
  setRootInert(false);
}

const base = Swal.mixin({
  toast: false,
  position: "center",
  allowOutsideClick: true,
  allowEscapeKey: true,
  heightAuto: false,

  returnFocus: false,
  focusConfirm: false,
  focusCancel: false,

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
    blurActiveElement();
    setTimeout(blurActiveElement, 0);
  },

  didClose: () => {
    // ✅ al cerrar, regresa la app a normal
    setRootInert(false);
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
  returnFocus: false,

  customClass: {
    popup: "alert-premium animated fadeIn faster swal-toast-center",
    title: "alert-title",
    htmlContainer: "alert-text",
  },

  buttonsStyling: false,

  didOpen: () => {
    blurActiveElement();
    setTimeout(blurActiveElement, 0);
  },

  didClose: () => {
    setRootInert(false);
  },
});

async function prepareBeforeFire() {
  hardClose();          // limpia restos
  blurActiveElement();  // quita foco actual
  setRootInert(true);   // 🔥 clave: evita foco dentro del root
  await new Promise<void>((r) => setTimeout(() => r(), 0)); // deja aplicar inert/blur
}

function fire(icon: SweetAlertIcon, title: string, text?: string) {
  return (async () => {
    await prepareBeforeFire();
    return base.fire({
      icon,
      title,
      html: text ? `<div>${text}</div>` : undefined,
    });
  })();
}

export const alertService = {
  success: (msg: string, title = "Listo") => fire("success", title, msg),
  error: (msg: string, title = "Ups…") => fire("error", title, msg),
  warning: (msg: string, title = "Atención") => fire("warning", title, msg),
  info: (msg: string, title = "Info") => fire("info", title, msg),

  toastSuccess: async (msg: string) => {
    await prepareBeforeFire();
    return toast.fire({ icon: "success", title: msg });
  },
  toastError: async (msg: string) => {
    await prepareBeforeFire();
    return toast.fire({ icon: "error", title: msg });
  },
  toastWarning: async (msg: string) => {
    await prepareBeforeFire();
    return toast.fire({ icon: "warning", title: msg });
  },
  toastInfo: async (msg: string) => {
    await prepareBeforeFire();
    return toast.fire({ icon: "info", title: msg });
  },

  confirm: async (titleOrOpts: string | ConfirmOpts, textMaybe?: string) => {
    await prepareBeforeFire();

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
      returnFocus: false,
      focusConfirm: false,
      focusCancel: false,
    });
  },

  loading: async (title = "Procesando...") => {
    await prepareBeforeFire();

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

  close: () => hardClose(),
  hardClose,
};