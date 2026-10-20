import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { register } from 'swiper/element/bundle';
import { MenuController } from '@ionic/angular';
import { AlumnoService } from 'src/app/services/alumno';

register();

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  
  usuarioActual: any = null;

  constructor(
    private menuCtrl: MenuController,
    private alumnoService: AlumnoService,
    private cdRef: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // 1. Cargar estado inicial inmediatamente
    this.cargarUsuarioInicial();

    // 2. Escuchar cambios de sesión en tiempo real
    this.alumnoService.usuario$.subscribe((usr) => {
      if (usr) {
        this.usuarioActual = usr;
        this.menuCtrl.enable(true);
      } else {
        this.usuarioActual = null;
        this.menuCtrl.enable(false);
        this.cerrarMenu();
      }
      this.cdRef.detectChanges();
    });
  }

  cargarUsuarioInicial() {
    const sessionData = sessionStorage.getItem('usuarioLogueado') || 
                        sessionStorage.getItem('usuario') || 
                        sessionStorage.getItem('user');
    
    if (sessionData) {
      try {
        this.usuarioActual = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;
        this.menuCtrl.enable(true);
      } catch (e) {
        console.error('Error parseando usuario en app.component:', e);
        this.deshabilitarMenu();
      }
    } else {
      this.deshabilitarMenu();
    }
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

  private obtenerTipoUsuario(): number {
    if (!this.usuarioActual) return 0;

    return Number(
      this.usuarioActual.id_tipo_usuario ?? 
      this.usuarioActual.tipo_usuario?.id_tipo_usuario ?? 
      0
    );
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