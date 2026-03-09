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
    if (el && typeof el.blur === "function") {
      el.blur();
    }
  } catch {}
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
  buttonsStyling: false,
  showConfirmButton: true,
  confirmButtonText: "Aceptar",

  customClass: {
    popup: "alert-premium",
    title: "alert-title",
    htmlContainer: "alert-text",
    confirmButton: "swal2-confirm-btn-premium",
    cancelButton: "swal2-cancel-btn-premium",
  },

  didOpen: () => {
    blurActiveElement();
  },

  willClose: () => {
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
  returnFocus: false,
  buttonsStyling: false,

  customClass: {
    popup: "alert-premium swal-toast-center",
    title: "alert-title",
    htmlContainer: "alert-text",
  },

  didOpen: () => {
    blurActiveElement();
  },

  willClose: () => {
    blurActiveElement();
  },
});

function fire(icon: SweetAlertIcon, title: string, text?: string) {
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

  toastSuccess: (msg: string) => toast.fire({ icon: "success", title: msg }),
  toastError: (msg: string) => toast.fire({ icon: "error", title: msg }),
  toastWarning: (msg: string) => toast.fire({ icon: "warning", title: msg }),
  toastInfo: (msg: string) => toast.fire({ icon: "info", title: msg }),

  confirm: (titleOrOpts: string | ConfirmOpts, textMaybe?: string) => {
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
      reverseButtons: true,
    });
  },

  loading: (title = "Procesando...") => {
    return base.fire({
      title,
      html: `
        <div class="alert-text">Espera un momento…</div>
        <div class="progress-bar-container">
          <div class="progress-bar"></div>
        </div>
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