import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { ActividadService } from 'src/app/services/actividad';
import { AlumnoService } from 'src/app/services/alumno';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: false
})
export class PerfilPage implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;

  usuario: any = null;
  nivelAlumno: string = 'Bronce';
  colorNivel: string = 'tertiary';
  cargando: boolean = true;

  segmentoSeleccionado: string = 'perfil';

  historialPuntos: any[] = [];
  misCanjes: any[] = [];

  cargandoHistorial: boolean = false;
  cargandoCanjes: boolean = false;

  editando: boolean = false;
  guardando: boolean = false;
  archivoFoto: File | null = null;
  perfilForm = {
    direccion: '',
    telefono: ''
  };

  // Variables para el cambio de contraseña
  mostrarCambiarPassword: boolean = false;
  cambiandoPassword: boolean = false;
  
  // Controles de visibilidad (ojito)
  verNuevaPassword: boolean = false;
  verConfirmarPassword: boolean = false;

  passwordForm = {
    nueva_password: '',
    confirmar_password: ''
  };

  constructor(
    private actividadService: ActividadService,
    private alumnoService: AlumnoService,
    private toastController: ToastController,
    private router: Router,
    private cdRef: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.cargarPerfil();
  }

  ionViewWillEnter() {
    this.cargarPerfil();
  }

  normalizarUsuario(data: any): any {
    if (!data) return null;

    const u = { ...data };
    const alumnoObj = data.alumno || data.datos_alumno || {};

    u.rut_usuario = u.rut_usuario || u.rut || alumnoObj.rut_usuario || alumnoObj.rut || '';
    u.nombre_completo = u.nombre_completo || u.nombre || alumnoObj.nombre_completo || '';
    u.correo = u.correo || u.email || alumnoObj.correo || '';
    
    u.direccion = u.direccion || alumnoObj.direccion || u.direccion_usuario || '';
    u.telefono = u.telefono || alumnoObj.telefono || u.telefono_usuario || '';

    u.imagen = u.imagen || u.foto || u.url_foto || alumnoObj.imagen || alumnoObj.foto || null;

    u.puntaje_total = u.puntaje_total ?? alumnoObj.puntaje_total ?? 0;

    return u;
  }

  cargarPerfil() {
    this.cargando = true;

    const sessionData = localStorage.getItem('usuarioLogueado') || 
                        localStorage.getItem('usuario') || 
                        localStorage.getItem('user') ||
                        sessionStorage.getItem('usuarioLogueado');

    if (sessionData) {
      try {
        let objetoLocal: any = null;

        if (typeof sessionData === 'string' && sessionData.trim().startsWith('{')) {
          objetoLocal = JSON.parse(sessionData);
          this.usuario = this.normalizarUsuario(objetoLocal);
        }

        const rut = this.usuario?.rut_usuario || objetoLocal?.rut || objetoLocal?.rut_usuario;

        if (rut) {
          this.alumnoService.getAlumnoByRut(rut).subscribe({
            next: (res: any) => {
              const alumnoBD = res?.data || res?.alumno || res;

              if (alumnoBD) {
                this.usuario = this.normalizarUsuario({ ...this.usuario, ...alumnoBD });

                this.perfilForm.direccion = this.usuario.direccion || '';
                this.perfilForm.telefono = this.usuario.telefono || '';

                this.calcularNivel(this.usuario.puntaje_total || 0);

                localStorage.setItem('usuarioLogueado', JSON.stringify(this.usuario));

                this.cargarHistorialPuntos(rut);
                this.cargarMisCanjes(rut);
              }
              this.cargando = false;
              this.cdRef.detectChanges();
            },
            error: (err: any) => {
              console.warn('Error al obtener alumno por RUT desde la API:', err);
              if (this.usuario) {
                this.perfilForm.direccion = this.usuario.direccion || '';
                this.perfilForm.telefono = this.usuario.telefono || '';
                this.calcularNivel(this.usuario.puntaje_total || 0);

                if (rut) {
                  this.cargarHistorialPuntos(rut);
                  this.cargarMisCanjes(rut);
                }
              }
              this.cargando = false;
              this.cdRef.detectChanges();
            }
          });
        } else {
          this.cargando = false;
        }
      } catch (e) {
        console.error('Error parseando datos de sesión local:', e);
        this.cargando = false;
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

  toggleEdicion() {
    this.editando = !this.editando;
    if (this.editando && this.usuario) {
      this.perfilForm.direccion = this.usuario.direccion || '';
      this.perfilForm.telefono = this.usuario.telefono || '';
    }
  }

  seleccionarImagen() {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  alSeleccionarArchivo(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.archivoFoto = file;
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        if (!this.usuario) this.usuario = {};
        this.usuario.imagen = e.target.result;
        this.cdRef.detectChanges();
      };
      reader.readAsDataURL(file);

      if (!this.editando) {
        this.guardarPerfil();
      }
    }
  }

  guardarPerfil() {
    const rut = this.usuario?.rut_usuario;
    if (!rut) return;

    this.guardando = true;

    const perfilData = {
      direccion: this.perfilForm.direccion,
      telefono: this.perfilForm.telefono
    };

    this.alumnoService.actualizarPerfil(
      rut,
      perfilData,
      this.archivoFoto || undefined
    ).subscribe({
      next: (res: any) => {
        const devuelto = res.usuario || res.alumno || res.data || res;
        this.usuario = this.normalizarUsuario({ ...this.usuario, ...devuelto });
        this.editando = false;
        this.guardando = false;
        this.archivoFoto = null;
        
        localStorage.setItem('usuarioLogueado', JSON.stringify(this.usuario));
        
        this.mostrarToast('Perfil actualizado correctamente', 'success');
        this.cdRef.detectChanges();
      },
      error: (err: any) => {
        this.guardando = false;
        console.error('Error actualizando perfil:', err);
        this.mostrarToast('Ocurrió un error al guardar los cambios', 'danger');
        this.cdRef.detectChanges();
      }
    });
  }

  /**
   * Alterna la visibilidad de la nueva contraseña
   */
  toggleVerNuevaPassword() {
    this.verNuevaPassword = !this.verNuevaPassword;
  }

  /**
   * Alterna la visibilidad de la confirmación de contraseña
   */
  toggleVerConfirmarPassword() {
    this.verConfirmarPassword = !this.verConfirmarPassword;
  }

  /**
   * Cambia la contraseña directamente enviando la nueva clave
   */
  cambiarPassword() {
    const rut = this.usuario?.rut_usuario;
    if (!rut) {
      this.mostrarToast('No se encontró el RUT del usuario', 'danger');
      return;
    }

    const { nueva_password, confirmar_password } = this.passwordForm;

    if (!nueva_password || !confirmar_password) {
      this.mostrarToast('Debes ingresar la nueva contraseña y su confirmación', 'warning');
      return;
    }

    if (nueva_password !== confirmar_password) {
      this.mostrarToast('Las contraseñas no coinciden', 'warning');
      return;
    }

    if (nueva_password.length < 6) {
      this.mostrarToast('La contraseña debe tener al menos 6 caracteres', 'warning');
      return;
    }

    this.cambiandoPassword = true;

    this.alumnoService.cambiarPasswordPerfil(rut, nueva_password).subscribe({
      next: (res: any) => {
        this.cambiandoPassword = false;
        this.mostrarToast(res.mensaje || 'Contraseña actualizada con éxito', 'success');
        
        // Limpiar formulario, resetear ojitos y ocultar sección desplegable
        this.passwordForm = {
          nueva_password: '',
          confirmar_password: ''
        };
        this.verNuevaPassword = false;
        this.verConfirmarPassword = false;
        this.mostrarCambiarPassword = false;
        this.cdRef.detectChanges();
      },
      error: (err: any) => {
        this.cambiandoPassword = false;
        const msg = err.error?.error || 'Error al cambiar la contraseña';
        this.mostrarToast(msg, 'danger');
        this.cdRef.detectChanges();
      }
    });
  }

  async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2500,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }

  cargarHistorialPuntos(rut: string) {
    this.cargandoHistorial = true;
    this.actividadService.getHistorialPuntos(rut).subscribe({
      next: (res: any) => {
        this.historialPuntos = Array.isArray(res) ? res : (res?.data || []);
        this.cargandoHistorial = false;
        this.cdRef.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al cargar historial:', err);
        this.cargandoHistorial = false;
        this.cdRef.detectChanges();
      }
    });
  }

  cargarMisCanjes(rut: string) {
    this.cargandoCanjes = true;
    this.actividadService.getMisCanjes(rut).subscribe({
      next: (res: any) => {
        const lista = Array.isArray(res) ? res : (res?.data || []);
        this.misCanjes = lista.filter((canje: any) => 
          canje.retiro_premio && canje.retiro_premio.retirado === true
        );
        this.cargandoCanjes = false;
        this.cdRef.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al cargar canjes:', err);
        this.cargandoCanjes = false;
        this.cdRef.detectChanges();
      }
    });
  }

  cambiarSegmento(event: any) {
    this.segmentoSeleccionado = event.detail.value;
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