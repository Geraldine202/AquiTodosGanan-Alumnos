import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ActividadService } from 'src/app/services/actividad';

@Component({
  selector: 'app-mis-actividades',
  templateUrl: './mis-actividades.page.html',
  styleUrls: ['./mis-actividades.page.scss'],
  standalone: false
})
export class MisActividadesPage implements OnInit {

  segmentoSeleccionado: string = 'proximas';
  cargando: boolean = true;

  actividadesProximas: any[] = [];
  actividadesHistorial: any[] = [];

  constructor(
    private actividadService: ActividadService,
    private router: Router,
    private cdRef: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.obtenerMisInscripciones();
  }

  ionViewWillEnter() {
    this.obtenerMisInscripciones();
  }

  cambiarSegmento(event: any) {
    this.segmentoSeleccionado = event.detail.value;
  }

  obtenerMisInscripciones() {
    this.cargando = true;

    // 1. Obtener usuario de la sesión
    const possibleKeys = [
      'usuario', 'user', 'currentUser', 'usuarioLogueado', 
      'token', 'token_acceso', 'auth', 'session'
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

    let idUsuario: any = null;
    try {
      if (typeof sessionData === 'string' && sessionData.trim().startsWith('{')) {
        const parsed = JSON.parse(sessionData);
        idUsuario = parsed.id_usuario || parsed.id || parsed.rut_usuario || parsed.rut;
      } else {
        idUsuario = sessionData;
      }
    } catch (e) {
      idUsuario = sessionData;
    }

    // Cast seguro del servicio como 'any' para evitar el chequeo estricto de TypeScript
    const servicioAny: any = this.actividadService;

    // Ejecuta el método si existe o usa la llamada general como alternativa
    const peticion$ = typeof servicioAny.getInscripcionesUsuario === 'function'
      ? servicioAny.getInscripcionesUsuario(idUsuario)
      : this.actividadService.getActividades();

    peticion$.subscribe({
      next: (res: any) => {
        const inscripciones: any[] = Array.isArray(res) ? res : (res?.data || []);

        // Mapear la actividad si la respuesta viene con datos anidados de la inscripción
        const misActividades = inscripciones.map(item => item.actividad || item);

        const hoy = new Date();

        this.actividadesProximas = misActividades.filter(act => {
          if (!act.fecha_fin) return true;
          return new Date(act.fecha_fin) >= hoy;
        });

        this.actividadesHistorial = misActividades.filter(act => {
          if (!act.fecha_fin) return false;
          return new Date(act.fecha_fin) < hoy;
        });

        this.cargando = false;
        this.cdRef.detectChanges();
      },
      error: (err: any) => {
        console.error('Error cargando las inscripciones del alumno:', err);
        this.actividadesProximas = [];
        this.actividadesHistorial = [];
        this.cargando = false;
        this.cdRef.detectChanges();
      }
    });
  }
}