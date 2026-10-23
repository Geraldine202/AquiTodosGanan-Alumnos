import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AlumnoService } from 'src/app/services/alumno';
import { ActividadService, InfoNivelUsuario } from 'src/app/services/actividad';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit, OnDestroy {

  estaLogueado: boolean = false;
  usuarioLogueado: any = null;
  nombreAlumno: string = 'Usuario/a';
  rutAlumno: string = '';
  misPuntos: number = 0;

  nivelUsuario: InfoNivelUsuario = {
    id_nivel: 1,
    nombre_nivel: 'Bronce',
    total_actividades: 0,
    faltantes_siguiente: 4
  };

  nivelAlumno: string = 'Bronce';
  colorNivel: string = 'tertiary';

  // Configuración y Datos de Carrusel/Slides
  actividadesSlides: any[] = [];
  actividadesProximas: any[] = [];
  notificaciones: any[] = [];
  totalActividades: number = 0;
  totalPremios: number = 0;

  // Variables específicas de perfil Docente
  misActividadesDocente: any[] = [];
  canjesPendientesDocente: any[] = [];

  private subUsuario!: Subscription;

  constructor(
    private alumnoService: AlumnoService,
    private actividadService: ActividadService,
    private router: Router,
    private cdRef: ChangeDetectorRef,
  ) { }

  ngOnInit() {
    // Escuchar el estado de la sesión en tiempo real desde el servicio
    this.subUsuario = this.alumnoService.usuario$.subscribe(usuario => {
      if (usuario) {
        this.procesarDatosUsuario(usuario);
      } else {
        this.limpiarEstado();
      }
    });

    this.cargarActividades();
    this.cargarPremios();
  }

  ionViewWillEnter() {
    // Re-evaluar datos e invocar refresco rápido al entrar
    this.cargarDatosUsuario();
    this.cargarActividades();
    this.cargarPremios();
  }

  ngOnDestroy() {
    if (this.subUsuario) {
      this.subUsuario.unsubscribe();
    }
  }

  private limpiarEstado() {
    this.estaLogueado = false;
    this.usuarioLogueado = null;
    this.nombreAlumno = 'Usuario/a';
    this.rutAlumno = '';
    this.misPuntos = 0;
    this.nivelAlumno = 'Bronce';
    this.colorNivel = 'tertiary';
    this.actividadesProximas = [];
    this.notificaciones = [];
    this.misActividadesDocente = [];
    this.canjesPendientesDocente = [];
    this.cdRef.detectChanges();
  }

  private limpiarRut(rut: any): string {
    if (!rut) return '';
    return String(rut).replace(/[^0-9kK]/g, '').trim();
  }

  obtenerTipoUsuario(): number {
    if (!this.usuarioLogueado) return 1;
    return Number(
      this.usuarioLogueado.id_tipo_usuario ?? 
      this.usuarioLogueado.tipo_usuario?.id_tipo_usuario ?? 
      1
    );
  }

  esDocente(): boolean {
    return this.obtenerTipoUsuario() === 3;
  }

  esAlumnoOConsejero(): boolean {
    const tipo = this.obtenerTipoUsuario();
    return tipo === 1 || tipo === 4;
  }

  cargarDatosUsuario() {
    const sessionData = sessionStorage.getItem('usuarioLogueado') || sessionStorage.getItem('usuario');

    if (!sessionData) {
      this.limpiarEstado();
      return;
    }

    let objetoUsuario: any = null;
    try {
      objetoUsuario = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;
    } catch (e) {
      console.error('Error parseando sesión local:', e);
    }

    if (objetoUsuario) {
      this.procesarDatosUsuario(objetoUsuario);
    }
  }

  private procesarDatosUsuario(objetoUsuario: any) {
    this.usuarioLogueado = objetoUsuario;
    const nombre = objetoUsuario.nombre_completo || objetoUsuario.nombre || 'Usuario';
    this.nombreAlumno = nombre.trim().split(' ')[0];
    this.estaLogueado = true;
    this.rutAlumno = objetoUsuario.rut_usuario || objetoUsuario.rut || '';

    // Asignar puntos instantáneos desde sesión
    this.misPuntos = Number(
      objetoUsuario.puntaje_total ?? objetoUsuario.puntaje ?? objetoUsuario.puntos ?? 0
    );

    if (objetoUsuario.nivelUsuarioInfo) {
      this.nivelUsuario = objetoUsuario.nivelUsuarioInfo;
      this.nivelAlumno = objetoUsuario.nivelAlumno || objetoUsuario.nivelUsuarioInfo.nombre_nivel;
      this.colorNivel = objetoUsuario.colorNivel || 'tertiary';
    }

    this.cdRef.detectChanges();

    // Consulta inmediata de actualización al servidor
    const rutLimpio = this.limpiarRut(this.rutAlumno);
    if (rutLimpio) {
      this.consultarDatosFrescosServidor(rutLimpio);
    }
  }

  private consultarDatosFrescosServidor(rutLimpio: string) {
    const servicioAny: any = this.actividadService;

    // 1. Consulta de Puntos Frescos
    if (typeof servicioAny.getPuntajeTotal === 'function') {
      servicioAny.getPuntajeTotal(rutLimpio).pipe(catchError(() => of(null))).subscribe((resPuntos: any) => {
        if (resPuntos !== null && resPuntos !== undefined) {
          const puntosFrescos = Number(
            resPuntos?.puntaje_total ?? resPuntos?.puntaje ?? resPuntos?.puntos ?? 
            (typeof resPuntos === 'number' ? resPuntos : this.misPuntos)
          );
          
          if (this.misPuntos !== puntosFrescos) {
            this.misPuntos = puntosFrescos;
            this.actualizarPuntosSesion(puntosFrescos);
            this.cdRef.detectChanges();
          }
        }
      });
    }

    // 2. Consulta de Nivel de Usuario
    if (typeof servicioAny.getNivelUsuario === 'function') {
      servicioAny.getNivelUsuario(rutLimpio).pipe(catchError(() => of(null))).subscribe((resNivel: any) => {
        if (resNivel) {
          this.nivelUsuario = resNivel;
          this.nivelAlumno = resNivel.nombre_nivel || 'Bronce';
          const idNivel = Number(resNivel.id_nivel ?? 1);
          this.colorNivel = idNivel === 3 ? 'medium' : idNivel === 2 ? 'warning' : 'tertiary';
          this.actualizarSesionConNivel(resNivel, this.nivelAlumno, this.colorNivel);
          this.cdRef.detectChanges();
        }
      });
    }

    // 3. Carga de actividades adicionales
    if (this.esAlumnoOConsejero()) {
      this.cargarProximasActividades(rutLimpio);
      this.cargarNotificaciones(rutLimpio);
    } else if (this.esDocente()) {
      this.cargarDatosDocente(rutLimpio);
    }
  }

  private actualizarPuntosSesion(puntosActuales: number) {
    if (!this.usuarioLogueado) return;

    this.usuarioLogueado.puntaje_total = puntosActuales;
    this.usuarioLogueado.puntaje = puntosActuales;
    this.usuarioLogueado.puntos = puntosActuales;

    const possibleKeys = ['usuarioLogueado', 'usuario', 'user', 'currentUser'];
    possibleKeys.forEach(key => {
      sessionStorage.setItem(key, JSON.stringify(this.usuarioLogueado));
    });

    // Notificar cambio al servicio global de alumnos si posee el metodo
    if (typeof (this.alumnoService as any).actualizarUsuarioEnMemoria === 'function') {
      (this.alumnoService as any).actualizarUsuarioEnMemoria(this.usuarioLogueado);
    }
  }

  private actualizarSesionConNivel(nivelInfo: InfoNivelUsuario, nombreNivel: string, color: string) {
    const possibleKeys = ['usuarioLogueado', 'usuario', 'user', 'currentUser'];

    possibleKeys.forEach(key => {
      const dataStr = sessionStorage.getItem(key);
      if (dataStr) {
        try {
          const obj = JSON.parse(dataStr);
          obj.nivelUsuarioInfo = nivelInfo;
          obj.nivelUsuario = nivelInfo;
          obj.nivelAlumno = nombreNivel;
          obj.colorNivel = color;

          sessionStorage.setItem(key, JSON.stringify(obj));
        } catch (e) {}
      }
    });
  }

  cargarDatosDocente(rutDocente: string) {
    this.actividadService.getActividades().subscribe({
      next: (res: any) => {
        const lista = Array.isArray(res) ? res : (res?.data || []);
        this.misActividadesDocente = lista.slice(0, 3);
        this.cdRef.detectChanges();
      }
    });
  }

  cargarProximasActividades(rutAlumno: string) {
    if (!rutAlumno) return;
    this.actividadService.obtenerInscripcionesPorUsuario(rutAlumno).subscribe({
      next: (res: any) => {
        const inscripciones = Array.isArray(res) ? res : (res?.data || []);
        const ahora = new Date();
        const limite48h = new Date(ahora.getTime() + (48 * 60 * 60 * 1000));

        this.actividadesProximas = inscripciones.filter((item: any) => {
          const act = item.actividad;
          if (!act || !act.fecha) return false;
          const fechaAct = new Date(`${act.fecha}T${act.hora_inicio || '00:00:00'}`);
          return fechaAct >= ahora && fechaAct <= limite48h;
        });

        this.cdRef.detectChanges();
      }
    });
  }

  cargarNotificaciones(rutAlumno: string) {
    if (!rutAlumno) return;
    this.actividadService.getNotificacionesAlumno(rutAlumno).subscribe({
      next: (data) => {
        this.notificaciones = data || [];
        this.cdRef.detectChanges();
      }
    });
  }

  cargarActividades() {
    this.actividadService.getActividades().subscribe({
      next: (res: any) => {
        const lista = Array.isArray(res) ? res : (res?.data || []);
        this.totalActividades = lista.length;
        this.actividadesSlides = lista.slice(0, 5);
        this.cdRef.detectChanges();
      }
    });
  }

  cargarPremios() {
    this.actividadService.getPremios().subscribe({
      next: (res: any) => {
        const lista = Array.isArray(res) ? res : (res?.data || []);
        this.totalPremios = lista.length;
        this.cdRef.detectChanges();
      }
    });
  }

  cerrarSesion() {
    localStorage.clear();
    sessionStorage.clear();
    this.limpiarEstado();
    this.alumnoService.cerrarSesion();
    this.router.navigate(['/login']);
  }
}