import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AlumnoService } from 'src/app/services/alumno';
import { ActividadService } from 'src/app/services/actividad';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {

  estaLogueado: boolean = false;
  usuarioLogueado: any = null;
  nombreAlumno: string = 'Alumno/a';
  misPuntos: number = 0;
  nivelAlumno: string = 'Bronce';
  colorNivel: string = 'tertiary';

  actividadesSlides: any[] = [];
  totalActividades: number = 0;
  totalPremios: number = 0;

  constructor(
    private alumnoService: AlumnoService,
    private actividadService: ActividadService,
    private router: Router,
    private cdRef: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.cargarDatosUsuario();
    this.cargarActividades();
    this.cargarPremios();
  }

  ionViewWillEnter() {
    this.cargarDatosUsuario();
  }

  cargarDatosUsuario() {
    // === DIAGNÓSTICO EN CONSOLA ===
    console.log('--- BUSCANDO SESIÓN EN STORAGE ---');
    console.log('localStorage keys:', Object.keys(localStorage));
    console.log('sessionStorage keys:', Object.keys(sessionStorage));

    // Revisamos absolutamente todas las posibles claves que usa el Header/Login
    const possibleKeys = [
      'usuario', 'user', 'currentUser', 'usuarioLogueado', 
      'token', 'token_acceso', 'auth', 'session'
    ];

    let sessionData: any = null;
    let keyEncontrada: string = '';

    for (const key of possibleKeys) {
      const valLocal = localStorage.getItem(key);
      const valSession = sessionStorage.getItem(key);
      if (valLocal || valSession) {
        sessionData = valLocal || valSession;
        keyEncontrada = key;
        break;
      }
    }

    console.log(`Clave detectada: [${keyEncontrada}]`, sessionData);

    if (sessionData) {
      try {
        let identificador = sessionData;
        let objetoUsuario: any = null;

        if (typeof sessionData === 'string' && sessionData.trim().startsWith('{')) {
          objetoUsuario = JSON.parse(sessionData);
          identificador = objetoUsuario.token || objetoUsuario.token_acceso || objetoUsuario.rut_usuario || objetoUsuario.rut || objetoUsuario.correo || sessionData;
        }

        // Si tenemos datos locales inmediatos (como los que muestra el Header), los aplicamos YA
        if (objetoUsuario) {
          const nombre = objetoUsuario.nombre_completo || objetoUsuario.nombre || objetoUsuario.nombre_usuario || objetoUsuario.username || 'prueba';
          this.nombreAlumno = nombre.trim().split(' ')[0];
          this.estaLogueado = true;
        } else {
          this.estaLogueado = true;
          this.nombreAlumno = sessionData;
        }

        // Consultamos al backend para actualizar los puntos y el nombre oficial de la BD
        if (identificador) {
          this.actividadService.getUsuarioSesion(identificador).subscribe({
            next: (userBD: any) => {
              console.log('Respuesta backend usuario:', userBD);
              if (userBD && (userBD.rut_usuario || userBD.nombre_completo)) {
                this.usuarioLogueado = userBD;
                this.estaLogueado = true;

                const nombres = (userBD.nombre_completo || this.nombreAlumno).trim().split(' ');
                this.nombreAlumno = nombres[0];

                this.misPuntos = userBD.puntaje_total ?? 0;
                this.calcularNivel(this.misPuntos);
              }
              this.cdRef.detectChanges();
            },
            error: (err: any) => {
              console.warn('Backend respondió error o no encontró token, pero mantenemos sesión local:', err);
              // Aunque falle el backend, si hay datos en storage mantenemos al usuario logueado
              this.estaLogueado = true;
              this.cdRef.detectChanges();
            }
          });
        }
      } catch (e) {
        console.error('Error parseando sesión:', e);
        this.estaLogueado = true; // Forzamos para no degradar la experiencia si hay algo guardado
      }
    } else {
      console.warn('No se encontró ninguna clave de usuario en el storage.');
      this.estaLogueado = false;
      this.misPuntos = 0;
    }

    this.cdRef.detectChanges();
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

  cargarActividades() {
    this.actividadService.getActividades().subscribe({
      next: (res: any) => {
        const lista = Array.isArray(res) ? res : (res?.data || []);
        this.totalActividades = lista.length;
        this.actividadesSlides = lista.slice(0, 5);
        this.cdRef.detectChanges();
      },
      error: (err: any) => console.error('Error al cargar actividades:', err)
    });
  }

  cargarPremios() {
    this.actividadService.getPremios().subscribe({
      next: (res: any) => {
        const lista = Array.isArray(res) ? res : (res?.data || []);
        this.totalPremios = lista.length;
        this.cdRef.detectChanges();
      },
      error: (err: any) => console.error('Error al cargar premios:', err)
    });
  }

  cerrarSesion() {
    localStorage.clear();
    sessionStorage.clear();
    this.estaLogueado = false;
    this.usuarioLogueado = null;
    this.router.navigate(['/login']);
  }
}