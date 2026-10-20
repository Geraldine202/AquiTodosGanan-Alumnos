import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { ActividadService, InfoNivelUsuario } from 'src/app/services/actividad';
import { AlumnoService } from 'src/app/services/alumno';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: false
})
export class PerfilPage implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef;

  usuario: any = null;
  nivelAlumno: string = 'Bronce';
  colorNivel: string = 'tertiary';
  cargando: boolean = true;

  nivelUsuarioInfo: InfoNivelUsuario = {
    id_nivel: 1,
    nombre_nivel: 'Bronce',
    total_actividades: 0,
    faltantes_siguiente: 4
  };

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

  mostrarCambiarPassword: boolean = false;
  cambiandoPassword: boolean = false;

  verNuevaPassword: boolean = false;
  verConfirmarPassword: boolean = false;

  passwordForm = {
    nueva_password: '',
    confirmar_password: ''
  };

  private subUsuario!: Subscription;

  constructor(
    private actividadService: ActividadService,
    private alumnoService: AlumnoService,
    private toastController: ToastController,
    private router: Router,
    private cdRef: ChangeDetectorRef
  ) { }

  ngOnInit() {
    // Escuchar estado de sesión en tiempo real
    this.subUsuario = this.alumnoService.usuario$.subscribe(usr => {
      if (!usr && !sessionStorage.getItem('usuarioLogueado')) {
        this.limpiarEstadoYSalir();
      }
    });

    this.cargarPerfil();
  }

  ionViewWillEnter() {
    this.cargarPerfil();
  }

  ngOnDestroy() {
    if (this.subUsuario) {
      this.subUsuario.unsubscribe();
    }
  }

  private limpiarEstadoYSalir() {
    this.usuario = null;
    this.cargando = false;
    this.cdRef.detectChanges();
    this.router.navigate(['/login']);
  }

  private limpiarRut(rut: any): string {
    if (!rut) return '';
    return String(rut).replace(/[^0-9kK]/g, '').trim();
  }

  normalizarUsuario(data: any, puntosOficiales?: number): any {
    if (!data) return null;

    const u = { ...data };
    const alumnoObj = data.alumno || data.datos_alumno || {};

    u.rut_usuario = u.rut_usuario || u.rut || alumnoObj.rut_usuario || alumnoObj.rut || '';
    u.nombre_completo = u.nombre_completo || u.nombre || alumnoObj.nombre_completo || '';
    u.correo = u.correo || u.email || alumnoObj.correo || '';
    
    u.direccion = u.direccion || alumnoObj.direccion || u.direccion_usuario || '';
    u.telefono = String(u.telefono || alumnoObj.telefono || u.telefono_usuario || '').replace(/\D/g, '');

    let rawId: any = null;
    if (data.id_tipo_usuario !== undefined && data.id_tipo_usuario !== null) {
      rawId = data.id_tipo_usuario;
    } else if (alumnoObj.id_tipo_usuario !== undefined && alumnoObj.id_tipo_usuario !== null) {
      rawId = alumnoObj.id_tipo_usuario;
    } else {
      rawId = u.id_tipo_usuario;
    }

    u.id_tipo_usuario = rawId !== null && rawId !== undefined ? Number(rawId) : 1;
    
    const descripciones: { [key: number]: string } = {
      1: 'Estudiante',
      2: 'Administrador',
      3: 'Docente',
      4: 'Consejero de carrera'
    };

    const descReal = descripciones[u.id_tipo_usuario] || 'Estudiante';

    u.tipo_usuario = {
      id_tipo_usuario: u.id_tipo_usuario,
      descripcion: descReal
    };

    u.imagen = u.imagen || u.foto || u.url_foto || alumnoObj.imagen || alumnoObj.foto || null;
    
    const pts = puntosOficiales !== undefined 
      ? puntosOficiales 
      : Number(u.puntaje_total ?? u.puntaje ?? u.puntos ?? alumnoObj.puntaje_total ?? 0);

    u.puntaje_total = pts;
    u.puntaje = pts;
    u.puntos = pts;

    return u;
  }

  cargarPerfil() {
    const possibleKeys = ['usuarioLogueado', 'usuario', 'user', 'currentUser'];
    let sessionData: any = null;

    // Solo consultar sessionStorage
    for (const key of possibleKeys) {
      const val = sessionStorage.getItem(key);
      if (val) {
        sessionData = val;
        break;
      }
    }

    if (!sessionData) {
      this.cargando = false;
      this.router.navigate(['/login']);
      return;
    }

    let objetoLocal: any = null;
    try {
      if (typeof sessionData === 'string' && sessionData.trim().startsWith('{')) {
        objetoLocal = JSON.parse(sessionData);
      } else {
        objetoLocal = { rut_usuario: sessionData };
      }
    } catch (e) {
      objetoLocal = { rut_usuario: sessionData };
    }

    const rutRaw = objetoLocal?.rut_usuario || objetoLocal?.rut || objetoLocal?.alumno?.rut_usuario || sessionData;
    const rutLimpio = this.limpiarRut(rutRaw);

    if (!rutLimpio) {
      this.cargando = false;
      return;
    }

    // 1. CARGA DESDE CACHÉ TEMPORAL (sessionStorage)
    if (objetoLocal) {
      if (objetoLocal.nivelUsuarioInfo) {
        this.nivelUsuarioInfo = objetoLocal.nivelUsuarioInfo;
        this.nivelAlumno = objetoLocal.nivelAlumno || objetoLocal.nivelUsuarioInfo.nombre_nivel;
        this.colorNivel = objetoLocal.colorNivel || 'tertiary';
      }

      this.usuario = this.normalizarUsuario(objetoLocal);
      this.perfilForm.direccion = this.usuario.direccion || '';
      this.perfilForm.telefono = String(this.usuario.telefono || '').replace(/\D/g, '');

      this.cargando = false;
      this.cdRef.detectChanges();
    }

    // 2. PETICIONES EN SEGUNDO PLANO
    const reqAlumno = this.alumnoService.getAlumnoByRut(rutLimpio).pipe(catchError(() => of(null)));
    const reqPuntos = this.actividadService.getPuntajeTotal(rutLimpio).pipe(catchError(() => of(null)));
    const reqNivel = this.actividadService.getNivelUsuario(rutLimpio).pipe(catchError(() => of(null)));

    forkJoin({
      alumnoBD: reqAlumno,
      resPuntos: reqPuntos,
      resNivel: reqNivel
    }).subscribe({
      next: ({ alumnoBD, resPuntos, resNivel }: any) => {
        const datosAlumnoBD = alumnoBD?.data || alumnoBD?.alumno || alumnoBD || {};
        const datosUnificados = {
          ...objetoLocal,
          ...datosAlumnoBD,
          id_tipo_usuario: datosAlumnoBD.id_tipo_usuario ?? objetoLocal.id_tipo_usuario
        };

        let puntosOficialesBD = this.usuario?.puntaje_total ?? 0;
        if (typeof resPuntos === 'number') {
          puntosOficialesBD = resPuntos;
        } else if (resPuntos && typeof resPuntos === 'object') {
          puntosOficialesBD = Number(resPuntos.puntaje_total ?? resPuntos.puntaje ?? resPuntos.puntos ?? resPuntos.total ?? 0);
        }

        if (resNivel) {
          this.nivelUsuarioInfo = resNivel;
          this.nivelAlumno = resNivel.nombre_nivel || 'Bronce';
          const idNivel = Number(resNivel.id_nivel ?? 1);
          this.colorNivel = idNivel === 3 ? 'medium' : idNivel === 2 ? 'warning' : 'tertiary';
        }

        this.usuario = this.normalizarUsuario(datosUnificados, puntosOficialesBD);

        if (!this.editando) {
          this.perfilForm.direccion = this.usuario.direccion || '';
          this.perfilForm.telefono = String(this.usuario.telefono || '').replace(/\D/g, '');
        }

        this.actualizarAlmacenamientoLocal(this.usuario);
        this.actualizarSesionConNivel(this.nivelUsuarioInfo, this.nivelAlumno, this.colorNivel);

        this.cargarHistorialPuntos(rutLimpio);
        this.cargarMisCanjes(rutLimpio);

        this.cargando = false;
        this.cdRef.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.cdRef.detectChanges();
      }
    });
  }

  private actualizarSesionConNivel(nivelInfo: InfoNivelUsuario, nombreNivel: string, color: string) {
    const possibleKeys = ['usuarioLogueado', 'usuario', 'user', 'currentUser'];

    possibleKeys.forEach(key => {
      const dataStr = sessionStorage.getItem(key);
      if (dataStr) {
        try {
          const obj = JSON.parse(dataStr);
          obj.nivelUsuarioInfo = nivelInfo;
          obj.nivelAlumno = nombreNivel;
          obj.colorNivel = color;

          sessionStorage.setItem(key, JSON.stringify(obj));
        } catch (e) {}
      }
    });
  }

  private actualizarAlmacenamientoLocal(usuarioActualizado: any) {
    if (!usuarioActualizado) return;
    const possibleKeys = ['usuarioLogueado', 'usuario', 'user', 'currentUser'];

    possibleKeys.forEach(key => {
      sessionStorage.setItem(key, JSON.stringify(usuarioActualizado));
    });

    if (this.alumnoService && typeof (this.alumnoService as any).notificarCambioUsuario === 'function') {
      (this.alumnoService as any).notificarCambioUsuario(usuarioActualizado);
    }
  }

  toggleEdicion() {
    this.editando = !this.editando;
    if (this.editando && this.usuario) {
      this.perfilForm.direccion = this.usuario.direccion || '';
      this.perfilForm.telefono = String(this.usuario.telefono || '').replace(/\D/g, '');
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

  validarFormularioPerfil(): boolean {
    const direccion = String(this.perfilForm.direccion || '').trim();
    let telefono = String(this.perfilForm.telefono || '').replace(/\D/g, '');

    if (direccion.length > 0 && direccion.length < 3) {
      this.mostrarToast('La dirección debe tener al menos 3 caracteres', 'warning');
      return false;
    }

    if (telefono.length > 0) {
      if (telefono.length === 8 && !telefono.startsWith('9')) {
        telefono = '9' + telefono;
        this.perfilForm.telefono = telefono;
      }

      if (telefono.length !== 9 || !telefono.startsWith('9')) {
        this.mostrarToast('Ingresa un número de teléfono válido de 9 dígitos que inicie con 9', 'warning');
        return false;
      }
    }

    return true;
  }

  guardarPerfil() {
    const rut = this.usuario?.rut_usuario;
    if (!rut) return;

    if (!this.validarFormularioPerfil()) {
      return;
    }

    this.guardando = true;

    let telefonoEnvio = String(this.perfilForm.telefono || '').replace(/\D/g, '');
    if (telefonoEnvio.length === 8 && !telefonoEnvio.startsWith('9')) {
      telefonoEnvio = '9' + telefonoEnvio;
    }

    const perfilData = {
      direccion: String(this.perfilForm.direccion || '').trim(),
      telefono: telefonoEnvio
    };

    this.alumnoService.actualizarPerfil(
      rut,
      perfilData,
      this.archivoFoto || undefined
    ).subscribe({
      next: (res: any) => {
        const devuelto = res.usuario || res.alumno || res.data || res;
        
        this.usuario = this.normalizarUsuario({ 
          ...this.usuario, 
          ...devuelto,
          nivelUsuarioInfo: this.nivelUsuarioInfo,
          nivelAlumno: this.nivelAlumno,
          colorNivel: this.colorNivel
        }, this.usuario?.puntaje_total);
        
        this.editando = false;
        this.guardando = false;
        this.archivoFoto = null;
        
        this.actualizarAlmacenamientoLocal(this.usuario);
        this.actualizarSesionConNivel(this.nivelUsuarioInfo, this.nivelAlumno, this.colorNivel);

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

  toggleVerNuevaPassword() {
    this.verNuevaPassword = !this.verNuevaPassword;
  }

  toggleVerConfirmarPassword() {
    this.verConfirmarPassword = !this.verConfirmarPassword;
  }

  validarPassword(password: string): string | null {
    if (password.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres.';
    }
    if (!/[A-Z]/.test(password)) {
      return 'La contraseña debe incluir al menos una letra mayúscula.';
    }
    if (!/[a-z]/.test(password)) {
      return 'La contraseña debe incluir al menos una letra minúscula.';
    }
    if (!/[0-9]/.test(password)) {
      return 'La contraseña debe incluir al menos un número.';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return 'La contraseña debe contener al menos un carácter especial (ej: @, #, $, !, %, *).';
    }
    return null;
  }
  
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

    const errorPassword = this.validarPassword(nueva_password);
    if (errorPassword) {
      this.mostrarToast(errorPassword, 'warning');
      return;
    }

    this.cambiandoPassword = true;

    this.alumnoService.cambiarPasswordPerfil(rut, nueva_password).subscribe({
      next: (res: any) => {
        this.cambiandoPassword = false;
        this.mostrarToast(res.mensaje || 'Contraseña actualizada con éxito', 'success');
        
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
        const msg = err.error?.error || err.error?.detail || 'Error al cambiar la contraseña';
        this.mostrarToast(msg, 'danger');
        this.cdRef.detectChanges();
      }
    });
  }

  async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }

  cargarHistorialPuntos(rut: string) {
    this.cargandoHistorial = true;
    this.actividadService.getHistorialPuntos(rut).subscribe({
      next: (res: any) => {
        const lista = Array.isArray(res) ? res : (res?.data || []);
        
        // ORDENAMIENTO DESCENDENTE: Los registros más recientes aparecen primero
        this.historialPuntos = lista.sort((a: any, b: any) => {
          const idA = Number(a.id_historial || a.id_inscripcion || a.id_actividad || a.id || 0);
          const idB = Number(b.id_historial || b.id_inscripcion || b.id_actividad || b.id || 0);
          return idB - idA;
        });

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
        const filtrados = lista.filter((canje: any) => 
          canje.retiro_premio && canje.retiro_premio.retirado === true
        );

        // ORDENAMIENTO DESCENDENTE: Los canjes retirados más recientes aparecen primero
        this.misCanjes = filtrados.sort((a: any, b: any) => {
          const idA = Number(a.id_canje || a.id_solicitud || a.id || 0);
          const idB = Number(b.id_canje || b.id_solicitud || b.id || 0);
          return idB - idA;
        });

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

  cerrarSesion() {
    localStorage.clear();
    sessionStorage.clear();
    this.alumnoService.cerrarSesion();
    this.router.navigate(['/login']);
  }
}