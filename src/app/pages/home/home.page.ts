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
    console.log('--- BUSCANDO SESIÓN EN STORAGE ---');
    
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

    if (sessionData) {
      try {
        let identificador = sessionData;
        let objetoUsuario: any = null;

        if (typeof sessionData === 'string' && sessionData.trim().startsWith('{')) {
          objetoUsuario = JSON.parse(sessionData);
          identificador = objetoUsuario.token || objetoUsuario.token_acceso || objetoUsuario.rut_usuario || objetoUsuario.rut || objetoUsuario.correo || sessionData;
        }

        if (objetoUsuario) {
          const nombre = objetoUsuario.nombre_completo || objetoUsuario.nombre || objetoUsuario.nombre_usuario || objetoUsuario.username || 'prueba';
          this.nombreAlumno = nombre.trim().split(' ')[0];
          this.estaLogueado = true;
          // Carga inicial rápida con lo que haya en storage
          this.misPuntos = objetoUsuario.puntaje_total ?? objetoUsuario.puntaje ?? 0;
          this.calcularNivel(this.misPuntos);
        } else {
          this.estaLogueado = true;
          this.nombreAlumno = sessionData;
        }

        // Consultar al backend la verdad absoluta de la BD
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

                // =========================================================
                // CORRECCIÓN CLAVE: Sobrescribir el Storage Local desactualizado
                // =========================================================
                if (keyEncontrada) {
                  // Si el storage guardaba un objeto, lo combinamos con los datos frescos del backend
                  if (objetoUsuario) {
                    const objetoActualizado = { ...objetoUsuario, ...userBD };
                    localStorage.setItem(keyEncontrada, JSON.stringify(objetoActualizado));
                  } else {
                    localStorage.setItem(keyEncontrada, JSON.stringify(userBD));
                  }
                }
                
                // Aseguramos también la clave principal 'usuario'
                localStorage.setItem('usuario', JSON.stringify(userBD));
              }
              this.cdRef.detectChanges();
            },
            error: (err: any) => {
              console.warn('Backend respondió error, se mantiene sesión local:', err);
              this.estaLogueado = true;
              this.cdRef.detectChanges();
            }
          });
        }
      } catch (e) {
        console.error('Error parseando sesión:', e);
        this.estaLogueado = true;
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