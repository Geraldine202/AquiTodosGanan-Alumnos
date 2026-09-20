import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ActividadService } from 'src/app/services/actividad';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: false
})
export class PerfilPage implements OnInit {

  usuario: any = null;
  nivelAlumno: string = 'Bronce';
  colorNivel: string = 'tertiary';
  cargando: boolean = true;

  constructor(
    private actividadService: ActividadService,
    private router: Router,
    private cdRef: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.cargarPerfil();
  }

  ionViewWillEnter() {
    this.cargarPerfil();
  }

  cargarPerfil() {
    this.cargando = true;

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

    if (sessionData) {
      try {
        let identificador = sessionData;

        if (typeof sessionData === 'string' && sessionData.trim().startsWith('{')) {
          const parsed = JSON.parse(sessionData);
          this.usuario = parsed;
          identificador = parsed.token || parsed.token_acceso || parsed.rut_usuario || parsed.rut || parsed.correo || sessionData;
        }

        if (identificador) {
          this.actividadService.getUsuarioSesion(identificador).subscribe({
            next: (userBD: any) => {
              if (userBD && (userBD.rut_usuario || userBD.nombre_completo)) {
                this.usuario = userBD;
                this.calcularNivel(userBD.puntaje_total || 0);
              }
              this.cargando = false;
              this.cdRef.detectChanges();
            },
            error: (err) => {
              console.warn('Error consultando perfil al backend:', err);
              if (this.usuario) {
                this.calcularNivel(this.usuario.puntaje_total || 0);
              }
              this.cargando = false;
              this.cdRef.detectChanges();
            }
          });
        }
      } catch (e) {
        console.error('Error parseando sesión:', e);
        this.cargando = false;
      }
    } else {
      // Si no hay sesión iniciada, redirige al login
      this.router.navigate(['/login']);
    }
  }

  calcularNivel(puntos: number) {
    if (puntos >= 500) {
      this.nivelAlumno = 'Oro';
      this.colorNivel = 'warning';
    } else if (puntos >= 200) {
      this.nivelAlumno = 'Plata';
      this.colorNivel = 'medium';
    } else {
      this.nivelAlumno = 'Bronce';
      this.colorNivel = 'tertiary';
    }
  }

  cerrarSesion() {
    localStorage.clear();
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }
}