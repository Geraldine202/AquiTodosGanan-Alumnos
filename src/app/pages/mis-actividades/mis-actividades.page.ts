import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { ActividadService, InscripcionDetalle } from 'src/app/services/actividad';

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
  
  // Propiedad para almacenar y mostrar el total consolidado de puntos acumulados
  puntajeTotal: number = 0;

  constructor(
    private actividadService: ActividadService,
    private alertController: AlertController,
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
cargarMisActividades() {
  this.cargando = true;

  const tokenAcceso = localStorage.getItem('token_acceso');
  const rutUsuario = localStorage.getItem('rut_usuario');
  const rutOToken = tokenAcceso || rutUsuario;

  if (!rutOToken) {
    console.warn('No se encontró token ni RUT en localStorage');
    this.cargando = false;
    return;
  }

  // 1. Obtener el puntaje total del alumno
  this.actividadService.getPuntajeTotal(rutOToken).subscribe({
    next: (res: any) => {
      this.puntajeTotal = res?.puntaje ?? 0;
    },
    error: (err) => {
      console.error('Error al obtener el puntaje total:', err);
      this.puntajeTotal = 0;
    }
  });

  // 2. Cargar inscripciones
  this.actividadService.getInscripcionesPorAlumno(rutOToken).subscribe({
    next: (inscripciones: any[]) => {
      console.log('Respuesta recibida de la API:', inscripciones);

      const ahora = new Date();
      this.actividadesProximas = [];
      this.actividadesHistorial = [];

      if (!inscripciones || !Array.isArray(inscripciones)) {
        this.cargando = false;
        return;
      }

      inscripciones.forEach((inscripcion: any) => {
        const act = inscripcion.actividad || inscripcion;

        if (act && (act.id_actividad || act.nombre_actividad)) {
          // Extraer lugar con seguridad
          let lugarNombre = 'Lugar no especificado';
          if (act.lugar_actividad && Array.isArray(act.lugar_actividad) && act.lugar_actividad.length > 0) {
            lugarNombre = act.lugar_actividad[0].descripcion || 'Lugar no especificado';
          } else if (act.lugar) {
            lugarNombre = act.lugar;
          }

          // Extraer puntos asignados a esta inscripción
          const puntosGanados = inscripcion.puntos_ganados ?? 0;

          // Extraer si está presente desde 'asistencia_act'
          let valPresente = null;
          if (Array.isArray(act.asistencia_act) && act.asistencia_act.length > 0) {
            valPresente = act.asistencia_act[0].presente;
          } else if (Array.isArray(inscripcion.asistencia_act) && inscripcion.asistencia_act.length > 0) {
            valPresente = inscripcion.asistencia_act[0].presente;
          } else if (inscripcion.asistencia_act && typeof inscripcion.asistencia_act === 'object') {
            valPresente = inscripcion.asistencia_act.presente;
          }

          // Se considera presente si el booleano es true O si ya ganó puntos (> 0)
          const estuvoPresente = 
            valPresente === true || 
            valPresente === 1 || 
            String(valPresente).toLowerCase() === 'true' ||
            puntosGanados > 0;

          const objetoActividad = {
            id_actividad: act.id_actividad,
            nombre_actividad: act.nombre_actividad,
            descripcion: act.descripcion,
            img_actv: act.img_actv,
            fecha: act.fecha,
            hora_inicio: act.hora_inicio,
            hora_termino: act.hora_termino,
            puntos: puntosGanados || (act.puntaje_act?.[0]?.cantidad ?? 0),
            lugar: lugarNombre,
            presente: estuvoPresente
          };

          // Determinar si la actividad ya terminó por fecha/hora
          let fechaFin: Date;
          if (act.fecha_termino) {
            fechaFin = new Date(act.fecha_termino);
          } else if (act.fecha && act.hora_termino) {
            const strFecha = String(act.fecha).replace(/-/g, '/');
            fechaFin = new Date(`${strFecha} ${act.hora_termino}`);
          } else {
            const strFecha = String(act.fecha).replace(/-/g, '/');
            fechaFin = new Date(`${strFecha} 23:59:59`);
          }

          const haFinalizado = fechaFin < ahora;

          // --- REGLA DE CLASIFICACIÓN NUEVA ---
          if (haFinalizado) {
            // 1. Si la actividad YA FINALIZÓ y el alumno estuvo presente -> Pasa al HISTORIAL
            if (estuvoPresente) {
              this.actividadesHistorial.push(objetoActividad);
            }
            // Si finalizó y NO asistió, se ignora/descarta automáticamente.
          } else {
            // 2. Si la actividad AÚN NO FINALIZA (está vigente/próxima):
            // Permanece en PRÓXIMAS (tenga o no asistencia confirmada)
            this.actividadesProximas.push(objetoActividad);
          }
        }
      });

      console.log('Actividades Próximas:', this.actividadesProximas);
      console.log('Actividades Historial:', this.actividadesHistorial);

      this.cargando = false;
    },
    error: (err: any) => {
      console.error('Error al cargar inscripciones:', err);
      this.cargando = false;
    }
  });
}
  // Navega al detalle de la actividad
  verDetalle(idActividad: number) {
    if (idActividad) {
      this.router.navigate(['/inscribir-actividad', idActividad]);
    }
  }

// Cancela la inscripción deteniendo el evento click para evitar navegar
// Cancela la inscripción deteniendo el evento click para evitar navegar
async salirDeActividad(event: Event, idActividad: number) {
  event.stopPropagation();

  // 1. Buscamos la actividad en la lista por su ID para verificar el estado de asistencia
  const actividad = this.actividadesProximas.find(a => a.id_actividad === idActividad) 
                 || this.actividadesHistorial.find(a => a.id_actividad === idActividad);

  // 2. VALIDACIÓN PREVIA EN EL CLIENTE:
  // Si la actividad ya tiene asistencia confirmada, bloqueamos la acción.
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
              // Recargar las actividades actualizadas
              this.cargarMisActividades();
            },
            error: async (err: any) => {
              console.error('Error al salir de la actividad:', err);
              this.cargando = false;

              // Captura el mensaje retornado por FastAPI (HTTP 400)
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