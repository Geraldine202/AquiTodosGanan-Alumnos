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

  // RESET OBLIGATORIO DE ARREGLOS ANTES DE CUALQUIER PETICIÓN HTTP
  this.actividadesProximas = [];
  this.actividadesHistorial = [];

  const rutUsuario = localStorage.getItem('rut_usuario');
  const tokenAcceso = localStorage.getItem('token_acceso');
  const rutParam = rutUsuario || tokenAcceso;

  if (!rutParam) {
    console.warn('No se encontró RUT ni token en localStorage');
    this.cargando = false;
    return;
  }

  // 1. Obtener Puntaje
  this.actividadService.getPuntajeTotal(rutParam).subscribe({
    next: (res: any) => this.puntajeTotal = res?.puntaje ?? 0,
    error: () => this.puntajeTotal = 0
  });

  // 2. Obtener Inscripciones
  this.actividadService.getInscripcionesPorAlumno(rutParam).subscribe({
    next: (inscripciones: any[]) => {
      // Volvemos a asegurar vaciado por si llegó una respuesta previa tardía
      this.actividadesProximas = [];
      this.actividadesHistorial = [];

      const idsProcesados = new Set<number>();

      if (Array.isArray(inscripciones)) {
        inscripciones.forEach((inscripcion: any) => {
          const act = inscripcion.actividad || inscripcion;
          const idAct = act?.id_actividad;

          if (act && idAct && !idsProcesados.has(idAct)) {
            idsProcesados.add(idAct);

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

            const estaPresente = Boolean(
              inscripcion.asistencia === true || 
              inscripcion.presente === true ||
              (Array.isArray(act.asistencia_act) && act.asistencia_act.some((a: any) => a.presente === true))
            );

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
              presente: estaPresente,
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
        if (Array.isArray(completadas) && completadas.length > 0) {
          completadas.forEach((item: any) => {
            const act = item.actividad || item;
            const idAct = act.id_actividad;

            const coincidenciaProxima = this.actividadesProximas.find((a) => a.id_actividad === idAct);
            const coincidenciaHistorial = this.actividadesHistorial.find((a) => a.id_actividad === idAct);

            const califVal = Number(item.calificacion ?? 0);
            const esRespondida = Boolean(item.encuesta_respondida) || califVal > 0;
            const estaPresente = Boolean(item.asistencia === true || item.presente === true);

            if (coincidenciaHistorial) {
              coincidenciaHistorial.encuesta_respondida = esRespondida;
              coincidenciaHistorial.calificacion = califVal;
              coincidenciaHistorial.presente = estaPresente;
              if (item.id_inscripcion) {
                coincidenciaHistorial.id_inscripcion = item.id_inscripcion;
              }
            } else if (!coincidenciaProxima) {
              // SOLO AGREGA SI NO ESTÁ NI EN PRÓXIMAS NI EN HISTORIAL
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
                presente: estaPresente,
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
        this.mostrarToast('Certificado enviado a tu correo.', 'success');
      },
      error: (err: any) => {
        console.error('Error al enviar el certificado:', err);
        this.mostrarToast('Error al enviar el certificado.', 'danger');
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