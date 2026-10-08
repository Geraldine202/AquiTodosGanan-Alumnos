import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, IonModal } from '@ionic/angular';
import { ActividadService } from 'src/app/services/actividad';

@Component({
  selector: 'app-mis-actividades',
  templateUrl: './mis-actividades.page.html',
  styleUrls: ['./mis-actividades.page.scss'],
  standalone: false,
})
export class MisActividadesPage implements OnInit {
  segmentoSeleccionado: string = 'proximas';
  cargando: boolean = true;

  actividadesProximas: any[] = [];
  actividadesHistorial: any[] = [];

  puntajeTotal: number = 0;

  // Propiedades para la encuesta
  actividadEncuestaSeleccionada: any = null;
  calificacionEncuesta: number = 0;
  comentarioEncuesta: string = '';
  enviandoEncuesta: boolean = false;

  constructor(
    private actividadService: ActividadService,
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router
  ) {}

  ngOnInit() {
    this.segmentoSeleccionado = 'proximas';
    this.cargarMisActividades();
  }

  ionViewWillEnter() {
    this.segmentoSeleccionado = 'proximas';
    this.cargarMisActividades();
  }

  // Helper para determinar si la actividad finalizó
  private esActividadFinalizada(act: any): boolean {
    if (!act) return false;

    const estadoId = Number(act.id_estado_actividad ?? act.estado_actividad?.id_estado_actividad ?? 1);
    const desc = (act.estado_actividad?.descripcion || act.estado || '').toLowerCase();

    if (estadoId === 3 || estadoId === 4 || desc.includes('finalizad') || desc.includes('cancelad') || desc.includes('terminad')) {
      return true;
    }

    const ahora = new Date();
    let fechaFin: Date;
    if (act.fecha_termino) {
      fechaFin = new Date(act.fecha_termino);
    } else if (act.fecha && act.hora_termino) {
      const fechaBase = String(act.fecha).split('T')[0].replace(/-/g, '/');
      fechaFin = new Date(`${fechaBase} ${act.hora_termino}`);
    } else if (act.fecha) {
      const fechaBase = String(act.fecha).split('T')[0].replace(/-/g, '/');
      fechaFin = new Date(`${fechaBase} 23:59:59`);
    } else {
      return false;
    }

    return fechaFin < ahora;
  }

cargarMisActividades() {
  this.cargando = true;

  // Priorizar rut_usuario siempre
  const rutUsuario = localStorage.getItem('rut_usuario');
  const tokenAcceso = localStorage.getItem('token_acceso');
  
  // Usar RUT si existe, sino el token
  const rutParam = rutUsuario || tokenAcceso;

  if (!rutParam) {
    console.warn('No se encontró RUT ni token en localStorage');
    this.cargando = false;
    return;
  }

  this.actividadesProximas = [];
  this.actividadesHistorial = [];

  // 1. Puntaje
  this.actividadService.getPuntajeTotal(rutParam).subscribe({
    next: (res: any) => this.puntajeTotal = res?.puntaje ?? 0,
    error: () => this.puntajeTotal = 0
  });

  // 2. Inscripciones principales
  this.actividadService.getInscripcionesPorAlumno(rutParam).subscribe({
    next: (inscripciones: any[]) => {
      if (Array.isArray(inscripciones)) {
        inscripciones.forEach((inscripcion: any) => {
          const act = inscripcion.actividad || inscripcion;

          if (act && (act.id_actividad || act.nombre_actividad)) {
            let lugarNombre = 'Lugar no especificado';
            if (act.lugar_actividad && Array.isArray(act.lugar_actividad) && act.lugar_actividad.length > 0) {
              lugarNombre = act.lugar_actividad[0].descripcion || 'Lugar no especificado';
            } else if (act.lugar) {
              lugarNombre = act.lugar;
            }

            const puntosGanados = inscripcion.puntos_ganados ?? 0;

            const calificacionVal = Number(
              inscripcion.calificacion ?? 
              act.calificacion ?? 
              (Array.isArray(inscripcion.encuesta) ? inscripcion.encuesta[0]?.calificacion : inscripcion.encuesta?.calificacion) ?? 
              0
            );

            const encuestaRespondida = 
              inscripcion.encuesta_respondida === true || 
              act.encuesta_respondida === true || 
              (Array.isArray(inscripcion.encuesta) && inscripcion.encuesta.length > 0) ||
              calificacionVal > 0;

            const objetoActividad = {
              id_actividad: act.id_actividad,
              id_inscripcion: inscripcion.id_inscripcion ?? act.id_inscripcion,
              nombre_actividad: act.nombre_actividad,
              descripcion: act.descripcion,
              img_actv: act.img_actv,
              fecha: act.fecha,
              hora_inicio: act.hora_inicio,
              hora_termino: act.hora_termino,
              puntos: puntosGanados || (act.puntaje_act?.[0]?.cantidad ?? 0),
              lugar: lugarNombre,
              presente: true,
              encuesta_respondida: encuestaRespondida,
              calificacion: calificacionVal
            };

            if (this.esActividadFinalizada(act)) {
              this.actividadesHistorial.push(objetoActividad);
            } else {
              this.actividadesProximas.push(objetoActividad);
            }
          }
        });
      }

      // Pasar explícitamente el RUT guardado en localStorage
      const rutReal = localStorage.getItem('rut_usuario') || rutParam;
      this.complementarConCompletadas(rutReal);
    },
    error: (err: any) => {
      const rutReal = localStorage.getItem('rut_usuario') || rutParam;
      this.complementarConCompletadas(rutReal);
    }
  });
}

private complementarConCompletadas(rutOToken: string) {
  this.actividadService.obtenerActividadesCompletadas(rutOToken).subscribe({
    next: (completadas: any[]) => {
      console.log('Actividades completadas desde API:', completadas); // Para depurar en F12

      if (Array.isArray(completadas) && completadas.length > 0) {
        completadas.forEach((item: any) => {
          const act = item.actividad || item;
          const idAct = act.id_actividad;

          const coincidencia = this.actividadesHistorial.find((a) => a.id_actividad === idAct);

          const califVal = Number(item.calificacion ?? 0);
          const esRespondida = Boolean(item.encuesta_respondida) || califVal > 0;

          if (coincidencia) {
            // Actualización forzada
            coincidencia.encuesta_respondida = esRespondida;
            coincidencia.calificacion = califVal;
            if (item.id_inscripcion) {
              coincidencia.id_inscripcion = item.id_inscripcion;
            }
          } else {
            let lugarNombre = 'Lugar no especificado';
            if (act.lugar_actividad && Array.isArray(act.lugar_actividad) && act.lugar_actividad.length > 0) {
              lugarNombre = act.lugar_actividad[0].descripcion || 'Lugar no especificado';
            } else if (act.lugar) {
              lugarNombre = act.lugar;
            }

            this.actividadesHistorial.push({
              id_actividad: act.id_actividad,
              id_inscripcion: item.id_inscripcion ?? act.id_inscripcion,
              nombre_actividad: act.nombre_actividad,
              descripcion: act.descripcion,
              img_actv: act.img_actv,
              fecha: act.fecha,
              hora_inicio: act.hora_inicio,
              hora_termino: act.hora_termino,
              puntos: item.puntos_ganados || item.puntos || 0,
              lugar: lugarNombre,
              presente: true,
              encuesta_respondida: esRespondida,
              calificacion: califVal
            });
          }
        });
      }
      this.cargando = false;
    },
    error: (err: any) => {
      console.warn('Error al complementar con actividades completadas:', err);
      this.cargando = false;
    }
  });
}

  // --- MÉTODOS PARA CERTIFICADOS Y ENCUESTAS ---

  abrirModalEncuesta(actividad: any, modal: IonModal) {
    this.actividadEncuestaSeleccionada = actividad;
    this.calificacionEncuesta = 0;
    this.comentarioEncuesta = '';
    modal.present();
  }

  guardarEncuesta(modal: IonModal) {
    if (this.calificacionEncuesta === 0) {
      this.mostrarToast('Por favor selecciona entre 1 y 5 estrellas.', 'warning');
      return;
    }

    this.enviandoEncuesta = true;

    const payload = {
      id_actividad: this.actividadEncuestaSeleccionada.id_actividad,
      id_inscripcion: this.actividadEncuestaSeleccionada.id_inscripcion,
      calificacion: this.calificacionEncuesta,
      comentario: this.comentarioEncuesta
    };

    this.actividadService.responderEncuesta(payload).subscribe({
      next: () => {
        this.enviandoEncuesta = false;
        this.mostrarToast('¡Gracias por evaluar esta actividad!', 'success');

        const itemHistorial = this.actividadesHistorial.find(
          (a) => a.id_actividad === this.actividadEncuestaSeleccionada.id_actividad
        );

        if (itemHistorial) {
          itemHistorial.encuesta_respondida = true;
          itemHistorial.calificacion = this.calificacionEncuesta;
        }

        modal.dismiss();
      },
      error: (err: any) => {
        this.enviandoEncuesta = false;
        const msg = err.error?.detail || 'Error al enviar la encuesta.';
        this.mostrarToast(msg, 'danger');
      }
    });
  }

descargarCertificado(act: any) {
  const rutUsuario = localStorage.getItem('rut_usuario');

  if (!rutUsuario) {
    console.warn('No se encontró el RUT del usuario para solicitar el certificado');
    return;
  }

  const payload = {
    rut_usuario: rutUsuario,
    id_actividad: act.id_actividad
  };

  this.actividadService.enviarCertificadoCorreo(payload).subscribe({
    next: (res: any) => {
      console.log('Certificado enviado correctamente:', res);
      // Aquí puedes mostrar una alerta de éxito
    },
    error: (err: any) => {
      console.error('Error al enviar el certificado:', err);
    }
  });
}

  private async mostrarToast(mensaje: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2500,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }

  verDetalle(idActividad: number) {
    if (idActividad) {
      this.router.navigate(['/inscribir-actividad', idActividad]);
    }
  }

  async salirDeActividad(event: Event, idActividad: number) {
    event.stopPropagation();

    const actividad = this.actividadesProximas.find(a => a.id_actividad === idActividad) 
                   || this.actividadesHistorial.find(a => a.id_actividad === idActividad);

    if (actividad && actividad.presente) {
      const alertBloqueo = await this.alertController.create({
        header: 'Acción no permitida',
        message: 'No puedes cancelar la inscripción de una actividad a la que ya asististe.',
        buttons: ['Aceptar']
      });
      await alertBloqueo.present();
      return;
    }

    const tokenAcceso = localStorage.getItem('token_acceso');
    const rutUsuario = localStorage.getItem('rut_usuario');
    const rutOToken = rutUsuario || tokenAcceso;

    if (!rutOToken) {
      console.error('No se encontró el RUT ni sesión del usuario.');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmar salida',
      message: '¿Estás seguro de que deseas cancelar tu inscripción a esta actividad?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Sí, salir',
          handler: () => {
            this.cargando = true;

            this.actividadService.cancelarInscripcion(rutOToken, idActividad).subscribe({
              next: () => {
                this.cargarMisActividades();
              },
              error: async (err: any) => {
                console.error('Error al salir de la actividad:', err);
                this.cargando = false;

                const mensajeError = err.error?.detail || 'No se pudo cancelar la inscripción.';

                const alertError = await this.alertController.create({
                  header: 'Error',
                  message: mensajeError,
                  buttons: ['Aceptar']
                });
                await alertError.present();
              }
            });
          }
        }
      ]
    });

    await alert.present();
  }

  cambiarSegmento(event: any) {
    this.segmentoSeleccionado = event.detail.value;
  }
}