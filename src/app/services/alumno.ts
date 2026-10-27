import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

export interface AlumnoPayload {
  rut_usuario: string;
  nombre_completo: string;
  genero?: string;
  correo: string;
  direccion?: string;
  telefono?: number | string;
  fecha_nacimiento?: string;
  jornada?: string;
  tipo_carrera?: string;
  periodo_academico?: string;
  id_tipo_usuario?: number;
  id_periodo_academico?: number;
  id_estado_matricula?: number;
  id_comuna?: number;
  id_sede?: number;
  id_escuela?: number;
  id_carrera?: number;
  id_requisito?: number;
  puntaje_total?: number;
  actividades_inscritas?: number;
  historial_academico_resumen?: string;
  matriculado?: boolean;
  suspension?: boolean;
  sumario?: boolean;
  cumple?: boolean;
  observacion?: string;
}

export interface HistorialPayload {
  rut_usuario: string;
  descripcion: string;
  id_escuela?: number;
}

@Injectable({ providedIn: 'root' })
export class AlumnoService {
  private baseUrl = 'http://localhost:3000';

  // ESTADO REACTIVO DE SESIÓN (Usa sessionStorage exclusivamente)
  private usuarioSubject = new BehaviorSubject<any>(this.obtenerUsuarioSesion());
  public usuario$ = this.usuarioSubject.asObservable();

  constructor(private http: HttpClient) { }

  private construirPayload(alumnoData: AlumnoPayload | { direccion?: string; telefono?: string } | FormData, foto?: File): FormData | any {
    if (alumnoData instanceof FormData) {
      return alumnoData;
    }

    if (foto) {
      const formData = new FormData();
      formData.append('foto', foto, foto.name);
      formData.append('datos', JSON.stringify(alumnoData));
      return formData;
    }

    return alumnoData;
  }

  // ==========================================
  // MÉTODOS DE GESTIÓN DE ALUMNOS Y FICHAS
  // ==========================================

  getAlumnos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/alumnos`);
  }

  getAlumnoByRut(rut: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/alumnos/${rut}`);
  }

  addAlumno(alumnoData: AlumnoPayload | FormData, foto?: File): Observable<any> {
    const payload = this.construirPayload(alumnoData, foto);
    return this.http.post<any>(`${this.baseUrl}/alumnos`, payload);
  }

  /**
   * Edita la información del alumno. Si el alumno editado es el mismo de la sesión activa,
   * actualiza sessionStorage y notifica a toda la app al instante.
   */
  editAlumno(rut: string, alumnoData: AlumnoPayload | FormData, foto?: File): Observable<any> {
    const payload = this.construirPayload(alumnoData, foto);
    return this.http.put<any>(`${this.baseUrl}/alumnos/${encodeURIComponent(rut)}`, payload).pipe(
      tap((res: any) => {
        const usuarioSesion = this.obtenerUsuarioSesion();
        if (usuarioSesion) {
          const rutLimpioSesion = String(usuarioSesion.rut_usuario || usuarioSesion.rut || '').replace(/[^0-9kK]/g, '').toUpperCase();
          const rutLimpioEditado = String(rut).replace(/[^0-9kK]/g, '').toUpperCase();

          if (rutLimpioSesion === rutLimpioEditado) {
            const devuelto = res?.usuario || res?.alumno || res?.data || res;
            
            // Extraer el id_tipo_usuario de forma tipo-segura sin romper FormData
            const idTipoFallback = !(alumnoData instanceof FormData) ? alumnoData.id_tipo_usuario : undefined;
            const nuevoTipo = devuelto?.id_tipo_usuario ?? idTipoFallback ?? usuarioSesion.id_tipo_usuario;

            const usuarioActualizado = {
              ...usuarioSesion,
              ...devuelto,
              id_tipo_usuario: Number(nuevoTipo)
            };
            
            this.notificarCambioUsuario(usuarioActualizado);
          }
        }
      })
    );
  }

  /**
   * Actualiza la foto, dirección y teléfono desde el perfil.
   */
  actualizarPerfil(rut: string, perfilData: { direccion?: string; telefono?: string }, foto?: File): Observable<any> {
    const payload = this.construirPayload(perfilData, foto);
    return this.http.put<any>(`${this.baseUrl}/alumnos/perfil/${encodeURIComponent(rut)}`, payload).pipe(
      tap((res: any) => {
        if (res && (res.usuario || res.alumno)) {
          const usuarioActual = this.obtenerUsuarioSesion() || {};
          const devuelto = res.usuario || res.alumno;
          const usuarioActualizado = { ...usuarioActual, ...devuelto };

          this.notificarCambioUsuario(usuarioActualizado);
        }
      })
    );
  }

  cambiarPasswordPerfil(rut_usuario: string, nueva_password: string): Observable<any> {
    const body = { rut_usuario, nueva_password };
    return this.http.put(`${this.baseUrl}/auth/cambiar-password-perfil`, body);
  }

  deleteAlumno(rut: string) {
    const rutLimpio = rut.replace(/\./g, '');
    return this.http.delete(`${this.baseUrl}/alumnos/${encodeURIComponent(rutLimpio)}`);
  }

  // ==========================================
  // HISTORIAL ACADÉMICO Y CATÁLOGOS
  // ==========================================

  getHistorialByRut(rut: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/alumnos/historial_academico/${rut}`);
  }

  addHistorial(data: HistorialPayload): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/alumnos/historial_academico`, data);
  }

  deleteHistorial(idHistorial: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/alumnos/historial_academico/${idHistorial}`);
  }

  getCarreras(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/carreras`);
  }

  getCarrerasByEscuela(idEscuela: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/carreras/escuela/${idEscuela}`);
  }

  getEscuelas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/escuelas`);
  }

  getSedes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/sedes`);
  }

  getJornadas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/jornadas`);
  }

  getTiposCarrera(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/tipos-carrera`);
  }

  getEstadosMatricula(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/estados-matricula`);
  }

  getPeriodosAcademicos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/periodos-academicos`);
  }

  // ==========================================
  // AUTENTICACIÓN Y CONTROL DE SESIÓN
  // ==========================================

  login(credenciales: { correo: string; password: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/login`, credenciales).pipe(
      tap((res: any) => {
        if (res && res.usuario) {
          this.guardarSesion(res);
        }
      })
    );
  }

  solicitarRecuperacion(correo: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/solicitar-recuperacion`, { correo });
  }

  restablecerPassword(datos: { token: string; nuevaContrasenia: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/restablecer-password`, datos);
  }

  logout(): Observable<any> {
    const usuario = this.obtenerUsuarioSesion();
    const rut_usuario = usuario?.rut_usuario;

    if (rut_usuario) {
      return this.http.post(`${this.baseUrl}/auth/logout`, { rut_usuario }).pipe(
        tap(() => this.limpiarSesionLocal()),
        catchError(() => {
          this.limpiarSesionLocal();
          return of(null);
        })
      );
    }

    this.limpiarSesionLocal();
    return of(null);
  }

  guardarSesion(respuestaLogin: any) {
    if (!respuestaLogin) {
      console.error('La respuesta de login está vacía');
      return;
    }

    const usuario = respuestaLogin.usuario || (respuestaLogin.rut_usuario ? respuestaLogin : null);
    const token = respuestaLogin.token_acceso;

    if (usuario) {
      this.notificarCambioUsuario(usuario);

      if (token) {
        sessionStorage.setItem('tokenAcceso', token);
      }
    } else {
      console.error('Intento de guardar una sesión con datos inválidos:', respuestaLogin);
    }
  }

  obtenerToken(): string | null {
    return sessionStorage.getItem('tokenAcceso');
  }

  estaLogueado(): boolean {
    return this.obtenerUsuarioSesion() !== null;
  }

  limpiarSesionLocal() {
    const keys = ['usuarioLogueado', 'usuario', 'user', 'currentUser', 'tokenAcceso'];
    keys.forEach(k => sessionStorage.removeItem(k));
    this.usuarioSubject.next(null);
  }

  cambiarPasswordObligatorio(rutUsuario: string, nuevaPassword: string) {
    return this.http.put(`${this.baseUrl}/auth/cambiar-password-obligatorio`, {
      rut_usuario: rutUsuario,
      nueva_password: nuevaPassword
    });
  }

  cerrarSesion() {
    this.logout().subscribe();
  }

  /**
   * Obtiene la sesión actual desde sessionStorage.
   */
  obtenerUsuarioSesion(): any {
    const keys = ['usuarioLogueado', 'usuario', 'user', 'currentUser'];
    for (const key of keys) {
      const data = sessionStorage.getItem(key);
      if (data) {
        try {
          return typeof data === 'string' && data.trim().startsWith('{')
            ? JSON.parse(data)
            : data;
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  }

  /**
   * Guarda en sessionStorage asegurando la estructura del id_tipo_usuario 
   * y notifica a todos los componentes suscritos en tiempo real.
   */
  public notificarCambioUsuario(usuario: any) {
    if (!usuario) return;

    // Normaliza id_tipo_usuario directamente en la raíz del objeto
    const idTipo = Number(
      usuario.id_tipo_usuario ?? 
      usuario.tipo_usuario?.id_tipo_usuario ?? 
      usuario.alumno?.id_tipo_usuario ?? 
      1
    );

    const usuarioFormateado = {
      ...usuario,
      id_tipo_usuario: idTipo
    };

    const strData = JSON.stringify(usuarioFormateado);
    const keys = ['usuarioLogueado', 'usuario', 'user', 'currentUser'];
    
    keys.forEach(k => {
      sessionStorage.setItem(k, strData);
    });

    this.usuarioSubject.next(usuarioFormateado);
  }
}