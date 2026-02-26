import Swal from 'sweetalert2';

export const alertService = {
  // Alerta de éxito con diseño mejorado
  success: (message: string, title: string = '¡Excelente!') => {
    return Swal.fire({
      icon: 'success',
      title: title,
      text: message,
      timer: 3000,
      showConfirmButton: false,
      position: 'center',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)',
      iconColor: '#2d9cdb',
      backdrop: 'rgba(0,0,0,0.4)',
      allowOutsideClick: true,
      allowEscapeKey: true,
      customClass: {
        popup: 'animated zoomIn alert-premium',
        title: 'alert-title',
        htmlContainer: 'alert-text'
      },
      showClass: {
        popup: 'animated zoomIn faster'
      },
      hideClass: {
        popup: 'animated zoomOut faster'
      }
    });
  },

  // Alerta de error con diseño mejorado
  error: (message: string, title: string = '¡Ups! Algo salió mal') => {
    return Swal.fire({
      icon: 'error',
      title: title,
      text: message,
      timer: 4000,
      showConfirmButton: false,
      position: 'center',
      background: 'linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)',
      iconColor: '#ef4444',
      backdrop: 'rgba(0,0,0,0.4)',
      allowOutsideClick: true,
      allowEscapeKey: true,
      customClass: {
        popup: 'animated shake alert-premium',
        title: 'alert-title',
        htmlContainer: 'alert-text'
      },
      showClass: {
        popup: 'animated fadeInDown faster'
      },
      hideClass: {
        popup: 'animated fadeOutUp faster'
      }
    });
  },

  // Alerta de advertencia con diseño mejorado
  warning: (message: string, title: string = 'Atención') => {
    return Swal.fire({
      icon: 'warning',
      title: title,
      text: message,
      timer: 4000,
      showConfirmButton: false,
      position: 'center',
      background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)',
      iconColor: '#f59e0b',
      backdrop: 'rgba(0,0,0,0.4)',
      allowOutsideClick: true,
      allowEscapeKey: true,
      customClass: {
        popup: 'animated pulse alert-premium',
        title: 'alert-title',
        htmlContainer: 'alert-text'
      },
      showClass: {
        popup: 'animated fadeInDown faster'
      },
      hideClass: {
        popup: 'animated fadeOutUp faster'
      }
    });
  },

  // Alerta de información con diseño mejorado
  info: (message: string, title: string = 'Información') => {
    return Swal.fire({
      icon: 'info',
      title: title,
      text: message,
      timer: 3000,
      showConfirmButton: false,
      position: 'center',
      background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
      iconColor: '#3b82f6',
      backdrop: 'rgba(0,0,0,0.4)',
      allowOutsideClick: true,
      allowEscapeKey: true,
      customClass: {
        popup: 'animated fadeInDown alert-premium',
        title: 'alert-title',
        htmlContainer: 'alert-text'
      },
      showClass: {
        popup: 'animated fadeInDown faster'
      },
      hideClass: {
        popup: 'animated fadeOutUp faster'
      }
    });
  },

  // Alerta de confirmación con diseño mejorado
  confirm: (message: string, title: string = '¿Confirmar acción?') => {
    return Swal.fire({
      title: title,
      text: message,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2d9cdb',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cancelar',
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      iconColor: '#f59e0b',
      backdrop: 'rgba(0,0,0,0.5)',
      reverseButtons: true,
      position: 'center',
      customClass: {
        popup: 'animated fadeInDown alert-premium',
        title: 'alert-title',
        htmlContainer: 'alert-text',
        confirmButton: 'swal2-confirm-btn-premium',
        cancelButton: 'swal2-cancel-btn-premium'
      }
    });
  },

  // Alerta de carga con diseño mejorado
  loading: (message: string = 'Procesando solicitud...') => {
    return Swal.fire({
      title: message,
      allowOutsideClick: false,
      showConfirmButton: false,
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      backdrop: 'rgba(0,0,0,0.5)',
      didOpen: () => {
        Swal.showLoading();
      },
      position: 'center',
      customClass: {
        popup: 'animated fadeIn alert-premium',
        title: 'alert-title'
      }
    });
  },

  // Alerta personalizada para procesos largos
  progress: (message: string = 'Subiendo archivo...') => {
    return Swal.fire({
      title: message,
      html: '<div class="progress-bar-container"><div class="progress-bar"></div></div>',
      showConfirmButton: false,
      allowOutsideClick: false,
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      backdrop: 'rgba(0,0,0,0.5)',
      position: 'center',
      customClass: {
        popup: 'animated fadeIn alert-premium',
        title: 'alert-title'
      }
    });
  },

  // Alerta con input
  prompt: (message: string, title: string = 'Ingresa los datos', inputPlaceholder: string = 'Escribe aquí...') => {
    return Swal.fire({
      title: title,
      text: message,
      input: 'text',
      inputPlaceholder: inputPlaceholder,
      showCancelButton: true,
      confirmButtonColor: '#2d9cdb',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Aceptar',
      cancelButtonText: 'Cancelar',
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      backdrop: 'rgba(0,0,0,0.5)',
      position: 'center',
      customClass: {
        popup: 'animated fadeInDown alert-premium',
        title: 'alert-title',
        input: 'alert-input'
      }
    });
  },

  // Cerrar alerta
  close: () => {
    Swal.close();
  }
};