import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { register } from 'swiper/element/bundle';
import { MenuController } from '@ionic/angular';
import { AlumnoService } from 'src/app/services/alumno';
import { Subscription } from 'rxjs';

register();

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  
  usuarioActual: any = null;
  private subUsuario!: Subscription;

  constructor(
    private menuCtrl: MenuController,
    private alumnoService: AlumnoService,
    private cdRef: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.limpiarCacheObsoleto();

    // 1. Carga inmediata desde el storage local
    this.cargarUsuarioInicial();

    // 2. Consulta en vivo a la Base de Datos para asegurar que el rol no esté desactualizado
    this.revalidarUsuarioConBD();

    // 3. Escuchar cambios emitidos en tiempo real por el servicio
    this.subUsuario = this.alumnoService.usuario$.subscribe((usr) => {
      if (usr) {
        this.usuarioActual = typeof usr === 'string' && usr.trim().startsWith('{') ? JSON.parse(usr) : usr;
        this.menuCtrl.enable(true);
      } else {
        this.usuarioActual = null;
        this.menuCtrl.enable(false);
        this.cerrarMenu();
      }
      this.cdRef.detectChanges();
    });
  }

  ngOnDestroy() {
    if (this.subUsuario) {
      this.subUsuario.unsubscribe();
    }
  }

  // Revalida con la Base de Datos cada vez que el usuario vuelve a enfocar la pestaña
  @HostListener('window:focus')
  onWindowFocus() {
    this.revalidarUsuarioConBD();
  }

  /**
   * Consulta directa al backend para sincronizar la sesión con la BD real
   */
  public revalidarUsuarioConBD() {
    const sesionLocal = this.alumnoService.obtenerUsuarioSesion();
    if (!sesionLocal) return;

    const rutRaw = sesionLocal.rut_usuario || sesionLocal.rut;
    if (!rutRaw) return;

    const rutLimpio = String(rutRaw).replace(/[^0-9kK]/g, '').trim();

    this.alumnoService.getAlumnoByRut(rutLimpio).subscribe({
      next: (res: any) => {
        const datosBD = res?.data || res?.alumno || res;
        if (datosBD && (datosBD.id_tipo_usuario !== undefined || datosBD.rut_usuario)) {
          const usuarioSincronizado = {
            ...sesionLocal,
            ...datosBD,
            id_tipo_usuario: Number(datosBD.id_tipo_usuario ?? sesionLocal.id_tipo_usuario)
          };

          // Actualiza sessionStorage y notifica a la app
          this.alumnoService.notificarCambioUsuario(usuarioSincronizado);
        }
      },
      error: (err) => {
        console.warn('No se pudo revalidar la sesión con la BD:', err);
      }
    });
  }

  private limpiarCacheObsoleto() {
    const keys = ['usuarioLogueado', 'usuario', 'user', 'currentUser'];
    keys.forEach(k => localStorage.removeItem(k));
  }

  cargarUsuarioInicial() {
    const sesion = this.alumnoService.obtenerUsuarioSesion();
    
    if (sesion) {
      this.usuarioActual = typeof sesion === 'string' && sesion.trim().startsWith('{')
        ? JSON.parse(sesion) 
        : sesion;
      this.menuCtrl.enable(true);
    } else {
      this.deshabilitarMenu();
    }
    this.cdRef.detectChanges();
  }

  deshabilitarMenu() {
    this.usuarioActual = null;
    this.menuCtrl.enable(false);
    this.menuCtrl.swipeGesture(false);
  }

  validarAperturaMenu() {
    if (!this.estaLogueado()) {
      this.menuCtrl.close();
      this.menuCtrl.enable(false);
    }
  }

  estaLogueado(): boolean {
    return !!this.usuarioActual;
  }

  public obtenerTipoUsuario(): number {
    if (!this.usuarioActual) return 0;

    const rawId = this.usuarioActual.id_tipo_usuario ?? 
                  this.usuarioActual.tipo_usuario?.id_tipo_usuario ?? 
                  this.usuarioActual.alumno?.id_tipo_usuario ?? 
                  this.usuarioActual.datos_alumno?.id_tipo_usuario ?? 
                  0;

    return Number(rawId);
  }

  get idTipoUsuario(): number {
    return this.obtenerTipoUsuario();
  }

  get esEstudiante(): boolean {
    return this.idTipoUsuario === 1;
  }

  get esAdmin(): boolean {
    return this.idTipoUsuario === 2;
  }

  get esDocente(): boolean {
    return this.idTipoUsuario === 3;
  }

  get esConsejero(): boolean {
    return this.idTipoUsuario === 4;
  }

  esAlumnoOConsejero(): boolean {
    if (!this.estaLogueado()) return false;
    const tipo = this.obtenerTipoUsuario();
    return tipo === 1 || tipo === 4;
  }

  esAdminActividades(): boolean {
    if (!this.estaLogueado()) return false;
    const tipo = this.obtenerTipoUsuario();
    return tipo === 3 || tipo === 4;
  }

  cerrarMenu() {
    this.menuCtrl.close();
  }
}