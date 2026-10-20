import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { IonicModule, MenuController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AlumnoService } from 'src/app/services/alumno';
import { ActividadService } from 'src/app/services/actividad';
import { Clima } from 'src/app/services/clima';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule]
})
export class HeaderComponent implements OnInit, OnDestroy {

  usuarioLogueado: any = null;
  nombreMostrar: string = 'Usuario';

  // Variables para el clima dinámico
  temperatura: string = '--';
  iconoClima: string = 'partly-sunny-outline';
  cargandoClima: boolean = true;

  private subUsuario!: Subscription;
  private subRouter!: Subscription;

  constructor(
    private alumnoService: AlumnoService,
    private actividadService: ActividadService,
    private climaService: Clima,
    public router: Router,
    private cdRef: ChangeDetectorRef,
    private menuCtrl: MenuController
  ) {}

  ngOnInit() {
    // 1. Consultar BD y sincronizar usuario inmediatamente
    this.obtenerUsuarioDesdeBD();

    // 2. Escuchar emisiones en tiempo real desde AlumnoService
    this.subUsuario = this.alumnoService.usuario$.subscribe(usuario => {
      if (usuario) {
        this.procesarUsuario(usuario);
        this.menuCtrl.enable(true);
      } else {
        this.limpiarEstadoUsuario();
      }
    });

    // 3. Re-consultar cada vez que cambia la ruta (solo si NO estamos en login)
    this.subRouter = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      if (!event.urlAfterRedirects.includes('/login')) {
        this.obtenerUsuarioDesdeBD();
      } else {
        this.limpiarEstadoUsuario();
      }
    });

    // 4. Cargar clima de Puente Alto
    this.obtenerClimaHeader();
  }

  ngOnDestroy() {
    if (this.subUsuario) this.subUsuario.unsubscribe();
    if (this.subRouter) this.subRouter.unsubscribe();
  }

  private limpiarEstadoUsuario() {
    this.usuarioLogueado = null;
    this.nombreMostrar = 'Usuario';
    this.menuCtrl.enable(false); // Deshabilita el menú lateral al estar deslogueado
    this.cdRef.detectChanges();
  }

  estaLogueado(): boolean {
    return !!this.usuarioLogueado;
  }

  /**
   * Lee la sesión desde sessionStorage y sincroniza con la Base de Datos
   */
  obtenerUsuarioDesdeBD() {
    if (this.router.url.includes('/login')) {
      this.limpiarEstadoUsuario();
      return;
    }

    const sessionData = sessionStorage.getItem('usuarioLogueado') || 
                        sessionStorage.getItem('usuario') || 
                        sessionStorage.getItem('user') ||
                        sessionStorage.getItem('currentUser');

    if (!sessionData) {
      this.limpiarEstadoUsuario();
      return;
    }

    try {
      let objeto = typeof sessionData === 'string' && sessionData.trim().startsWith('{') 
                   ? JSON.parse(sessionData) 
                   : sessionData;

      if (typeof objeto === 'object' && objeto !== null) {
        this.procesarUsuario(objeto);
      }

      const identificador = typeof objeto === 'object' 
                            ? (objeto.rut_usuario || objeto.rut || objeto.correo || objeto.token) 
                            : sessionData;

      if (identificador) {
        this.actividadService.getUsuarioSesion(identificador).subscribe({
          next: (userBD: any) => {
            if (userBD) {
              this.procesarUsuario(userBD);

              const actualizado = (typeof objeto === 'object' && objeto !== null)
                ? { ...objeto, ...userBD }
                : userBD;

              sessionStorage.setItem('usuarioLogueado', JSON.stringify(actualizado));
              sessionStorage.setItem('usuario', JSON.stringify(actualizado));
            }
          },
          error: (err: any) => {
            console.warn('Error al consultar BD desde Header, se mantiene sesión local:', err);
          }
        });
      }
    } catch (e) {
      console.error('Error parseando datos de sesión en Header:', e);
    }
  }

  procesarUsuario(data: any) {
    if (!data) {
      this.limpiarEstadoUsuario();
      return;
    }
    this.usuarioLogueado = data;
    this.menuCtrl.enable(true);

    const subObj = data.alumno || data.docente || data.datos_alumno || data.datos_docente || data.persona || {};

    let rawNombre: string = data.nombre_completo || 
                            subObj.nombre_completo || 
                            data.nombre || 
                            subObj.nombre || 
                            data.nombres ||
                            subObj.nombres ||
                            '';

    rawNombre = rawNombre.trim();

    const rolesProhibidos = ['docente', 'estudiante', 'administrador', 'consejero de carrera', 'consejero', 'alumno'];

    if (!rawNombre || rolesProhibidos.includes(rawNombre.toLowerCase())) {
      const correo = data.correo || data.email || subObj.correo || '';
      if (correo && correo.includes('@')) {
        this.nombreMostrar = correo.split('@')[0];
      } else {
        this.nombreMostrar = 'Usuario';
      }
    } else {
      this.nombreMostrar = rawNombre.split(' ')[0];
    }

    this.cdRef.detectChanges();
  }

  obtenerClimaHeader() {
    this.climaService.obtenerClimaActual(-33.6117, -70.5758).subscribe({
      next: (data) => {
        if (data && data.current_weather) {
          const temp = Math.round(data.current_weather.temperature);
          this.temperatura = `${temp}°C`;
          this.iconoClima = this.mapearIconoClima(data.current_weather.weathercode);
        }
        this.cargandoClima = false;
        this.cdRef.detectChanges();
      },
      error: (err) => {
        console.error('Error al obtener clima:', err);
        this.temperatura = '18°C';
        this.cargandoClima = false;
        this.cdRef.detectChanges();
      }
    });
  }

  private mapearIconoClima(code: number): string {
    if (code === 0) return 'sunny-outline';
    if (code >= 1 && code <= 3) return 'partly-sunny-outline';
    if (code >= 45 && code <= 48) return 'cloudy-outline';
    if (code >= 51 && code <= 67) return 'rainy-outline';
    if (code >= 80 && code <= 82) return 'thunderstorm-outline';
    return 'partly-sunny-outline';
  }

  cerrarSesion() {
    this.limpiarEstadoUsuario();
    localStorage.clear();
    sessionStorage.clear();
    this.alumnoService.cerrarSesion();
    this.router.navigate(['/login']);
  }
}