import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { ActividadService, InscripcionCreate, InscripcionDetalle } from 'src/app/services/actividad';

@Component({
  selector: 'app-inscribir-actividad',
  templateUrl: './inscribir-actividad.page.html',
  styleUrls: ['./inscribir-actividad.page.scss'],
  standalone: false
})
export class InscribirActividadPage implements OnInit {

  actividadesDisponibles: any[] = [];
  cargando: boolean = true;
  procesando: boolean = false;
  usuarioLogueado: any = null;
  nombreSede: string = '';
  puntajeTotal: number = 0;

  constructor(
    private actividadService: ActividadService,
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router,
    private cdRef: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.cargarDatos();
  }

  ionViewWillEnter() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.cargando = true;

    // 1. Obtener usuario de la sesión
    const possibleKeys = [
      'usuario', 'user', 'currentUser', 'usuarioLogueado', 
      'token', 'token_acceso', 'rut_usuario', 'auth', 'session'
    ];

    let sessionData: any = null;

    for (const key of possibleKeys) {
      const valLocal = localStorage.getItem(key);
      const valSession = sessionStorage.getItem(key);
      if (valLocal || valSession) {
        sessionData = valLocal || valSession;
        break;
      }
    }

    if (!sessionData) {
      this.cargando = false;
      this.router.navigate(['/login']);
      return;
    }

    try {
      if (typeof sessionData === 'string' && sessionData.trim().startsWith('{')) {
        this.usuarioLogueado = JSON.parse(sessionData);
      } else {
        this.usuarioLogueado = { rut_usuario: sessionData };
      }
    } catch (e) {
      this.usuarioLogueado = { rut_usuario: sessionData };
    }

    // 2. Extraer RUT
    const rawRut = 
      this.usuarioLogueado?.rut_usuario || 
      this.usuarioLogueado?.rut_alumno || 
      this.usuarioLogueado?.rut || 
      localStorage.getItem('rut_usuario') || 
      sessionData;

    if (!rawRut) {
      this.cargando = false;
      this.router.navigate(['/login']);
      return;
    }

    // Limpieza de RUT: quitar puntos para evitar problemas con la API
    const rutLimpio = String(rawRut).replace(/\./g, '').trim();

    // 3. Cargar actividades filtradas por Sede
    this.actividadService.getActividadesPorSede(rutLimpio).subscribe({
      next: (res: any) => {
        this.nombreSede = res?.sede || '';
        const listaSede: any[] = Array.isArray(res) ? res : (res?.actividades || res?.data || []);

        const ahora = new Date();

        // Filtrar vigencia usando la columna `fecha` y opcionalmente `hora_termino`
        const actividadesVigentes = listaSede.filter((act: any) => {
          if (!act.fecha) return true;

          // Convertir "YYYY-MM-DD" + "HH:MM:SS" a objeto Date de evaluación
          const fechaTerminoStr = act.hora_termino 
            ? `${act.fecha}T${act.hora_termino}` 
            : `${act.fecha}T23:59:59`;

          const fechaTermino = new Date(fechaTerminoStr);
          return fechaTermino >= ahora;
        });

        // 4. Consultar inscripciones previas del alumno
        this.actividadService.getInscripcionesPorAlumno(rutLimpio).subscribe({
          next: (inscripciones: InscripcionDetalle[]) => {
            const listInsc = Array.isArray(inscripciones) ? inscripciones : [];
            const idsInscritos = listInsc.map(i => i.id_actividad);

            this.puntajeTotal = listInsc.reduce((acc, curr) => acc + (curr.puntos_ganados || 0), 0);

            // Mapear campos adaptados a las tablas hijas de la base de datos SQL
            this.actividadesDisponibles = actividadesVigentes.map((act: any) => {
              // Obtener datos de tablas hijas si vienen incluidas en la consulta ORM
              const cuposDisponibles = act.cupo_actividad?.[0]?.cantidad ?? act.cupos ?? 0;
              const lugarNombre = act.lugar_actividad?.[0]?.descripcion ?? act.calendario?.[0]?.lugar ?? act.lugar ?? 'Por definir';
              const puntosOtorgados = act.puntaje_act?.[0]?.cantidad ?? act.puntos ?? 0;

              return {
                ...act,
                cupos_disponibles: cuposDisponibles,
                lugar: lugarNombre,
                puntos: puntosOtorgados,
                inscrito: idsInscritos.includes(act.id_actividad)
              };
            });

            this.cargando = false;
            this.cdRef.detectChanges();
          },
          error: (err) => {
            console.warn('No se pudieron consultar inscripciones previas:', err);
            
            this.actividadesDisponibles = actividadesVigentes.map((act: any) => ({
              ...act,
              cupos_disponibles: act.cupo_actividad?.[0]?.cantidad ?? act.cupos ?? 0,
              lugar: act.lugar_actividad?.[0]?.descripcion ?? act.lugar ?? 'Por definir',
              puntos: act.puntaje_act?.[0]?.cantidad ?? act.puntos ?? 0,
              inscrito: false
            }));

            this.cargando = false;
            this.cdRef.detectChanges();
          }
        });
      },
      error: (err: any) => {
        console.error('Error al cargar actividades por sede:', err);
        this.mostrarToast('Error al conectar con el servidor', 'danger');
        this.cargando = false;
        this.cdRef.detectChanges();
      }
    });
  }

  async confirmarInscripcion(actividad: any) {
    const alert = await this.alertController.create({
      header: 'Confirmar Inscripción',
      message: `¿Deseas inscribirte en "${actividad.nombre_actividad}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Sí, inscribirme',
          handler: () => {
            this.ejecutarInscripcion(actividad);
          }
        }
      ]
    });

    await alert.present();
  }

ejecutarInscripcion(actividad: any) {
  this.procesando = true;

  const rawRut = 
    this.usuarioLogueado?.rut_usuario || 
    this.usuarioLogueado?.rut_alumno || 
    this.usuarioLogueado?.rut || 
    localStorage.getItem('rut_usuario') ||
    localStorage.getItem('token_acceso');

  if (!rawRut) {
    this.procesando = false;
    this.mostrarToast('No se encontró el RUT del alumno en la sesión activa', 'danger');
    return;
  }

  const rutLimpio = String(rawRut).replace(/\./g, '').trim();

  // Se envía rut_alumno como lo exige el Pydantic de FastAPI
  const payload: InscripcionCreate = {
    rut_alumno: rutLimpio,
    id_actividad: Number(actividad.id_actividad) // Garantiza formato entero
  };

  this.actividadService.inscribirAlumno(payload).subscribe({
    next: async (res) => {
      actividad.inscrito = true;
      
      if (res.cupos_restantes !== undefined) {
        actividad.cupos_disponibles = res.cupos_restantes;
        if (actividad.cupo_actividad?.[0]) {
          actividad.cupo_actividad[0].cantidad = res.cupos_restantes;
        }
      }

      this.procesando = false;
      await this.mostrarToast(res.mensaje || '¡Inscripción realizada con éxito!', 'success');
      this.router.navigate(['/mis-actividades']);
    },
    error: async (err: any) => {
      console.error('Error al inscribir:', err);
      this.procesando = false;
      
      const mensajeError = typeof err.error?.detail === 'string' 
        ? err.error.detail 
        : 'No se pudo procesar la inscripción.';

      await this.mostrarToast(mensajeError, 'danger');
    }
  });
}
  async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3500,
      color: color,
      position: 'bottom'
    });
    await toast.present();
  }
}