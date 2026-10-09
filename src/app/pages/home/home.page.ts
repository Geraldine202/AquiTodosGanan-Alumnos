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
  actividadesProximas: any[] = []; // <-- PROPIEDAD PARA EL BANNER DE ACTIVIDADES PRÓXIMAS
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
    this.ejecutarRecordatoriosControlado();
  }

  ionViewWillEnter() {
    this.cargarDatosUsuario();
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
      },
      error: (err: any) => {
        console.warn('No se pudieron obtener inscripciones del alumno para el banner:', err);
      }
    });
  }
  ejecutarRecordatoriosControlado() {
    const ULTIMA_CHECK = 'last_recordatorios_check';
    const ultimoRegistro = localStorage.getItem(ULTIMA_CHECK);
    const ahora = new Date().getTime();
    const UNA_HORA_MS = 60 * 60 * 1000;

    if (!ultimoRegistro || (ahora - Number(ultimoRegistro)) > UNA_HORA_MS) {
      this.actividadService.verificarRecordatoriosActividades(48).subscribe({
        next: (res) => {
          console.log('[RECORDATORIOS] Verificación realizada:', res);
          localStorage.setItem(ULTIMA_CHECK, ahora.toString());
        },
        error: (err) => console.warn('[RECORDATORIOS] Error silencioso al verificar:', err)
      });
    }
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
          this.misPuntos = objetoUsuario.puntaje_total ?? objetoUsuario.puntaje ?? 0;
          this.calcularNivel(this.misPuntos);

          // Cargar avisos visuales desde el RUT en storage
          const rutTemp = objetoUsuario.rut_usuario || objetoUsuario.rut;
          if (rutTemp) {
            this.cargarProximasActividades(rutTemp);
          }
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

                // Cargar inscripciones para el banner con el RUT verificado
                if (userBD.rut_usuario) {
                  this.cargarProximasActividades(userBD.rut_usuario);
                }

                if (keyEncontrada) {
                  if (objetoUsuario) {
                    const objetoActualizado = { ...objetoUsuario, ...userBD };
                    localStorage.setItem(keyEncontrada, JSON.stringify(objetoActualizado));
                  } else {
                    localStorage.setItem(keyEncontrada, JSON.stringify(userBD));
                  }
                }
                
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
      this.actividadesProximas = [];
    }

    this.cdRef.detectChanges();
  }

  /**
   * Consulta las actividades inscritas del estudiante y filtra únicamente las que
   * ocurrirán en las próximas 48 horas.
   */


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
    this.actividadesProximas = [];
    this.router.navigate(['/login']);
  }
}