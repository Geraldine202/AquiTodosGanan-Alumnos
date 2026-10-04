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

  // ESTADO REACTIVO DE SESIÓN
  private usuarioSubject = new BehaviorSubject<any>(this.obtenerUsuarioSesion());
  public usuario$ = this.usuarioSubject.asObservable();

  constructor(private http: HttpClient) { }

  // ==========================================
  // HELPER PARA EMPAQUETAR FORM DATA
  // ==========================================

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

  editAlumno(rut: string, alumnoData: AlumnoPayload | FormData, foto?: File): Observable<any> {
    const payload = this.construirPayload(alumnoData, foto);
    return this.http.put<any>(`${this.baseUrl}/alumnos/${rut}`, payload);
  }

  /**
   * Actualiza únicamente la foto, dirección y teléfono del alumno desde el perfil.
   * Actualiza automáticamente el estado del usuario en sesión local (localStorage + BehaviorSubject).
   */
  actualizarPerfil(rut: string, perfilData: { direccion?: string; telefono?: string }, foto?: File): Observable<any> {
    const payload = this.construirPayload(perfilData, foto);
    return this.http.put<any>(`${this.baseUrl}/alumnos/perfil/${encodeURIComponent(rut)}`, payload).pipe(
      tap((res: any) => {
        if (res && res.usuario) {
          const usuarioActual = this.obtenerUsuarioSesion() || {};
          const usuarioActualizado = { ...usuarioActual, ...res.usuario };
          
          localStorage.setItem('usuarioLogueado', JSON.stringify(usuarioActualizado));
          this.usuarioSubject.next(usuarioActualizado);
        }
      })
    );
  }

  deleteAlumno(rut: string) {
    // Elimina los puntos del RUT dejando solo números y dígito verificador (ej: "22222222-2")
    const rutLimpio = rut.replace(/\./g, '');
    
    return this.http.delete(`${this.baseUrl}/alumnos/${encodeURIComponent(rutLimpio)}`);
  }

  // ==========================================
  // MÉTODOS DE HISTORIAL ACADÉMICO
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

  // ==========================================
  // MÉTODOS DE GESTIÓN DE CATÁLOGOS Y CARRERAS
  // ==========================================

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
  // MÉTODOS DE AUTENTICACIÓN Y RECUPERACIÓN
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

  // ==========================================
  // CONTROL DE SESIÓN Y LOCALSTORAGE
  // ==========================================

  guardarSesion(respuestaLogin: any) {
    if (!respuestaLogin) {
      console.error('La respuesta de login está vacía');
      return;
    }

    const usuario = respuestaLogin.usuario || (respuestaLogin.rut_usuario ? respuestaLogin : null);
    const token = respuestaLogin.token_acceso;

    if (usuario) {
      localStorage.setItem('usuarioLogueado', JSON.stringify(usuario));

      if (token) {
        localStorage.setItem('tokenAcceso', token);
      }

      this.usuarioSubject.next(usuario);
    } else {
      console.error('Intento de guardar una sesión con datos inválidos:', respuestaLogin);
    }
  }

  obtenerUsuarioSesion(): any {
    const user = localStorage.getItem('usuarioLogueado');

    if (!user || user === 'undefined' || user === 'null') {
      return null;
    }

    try {
      return JSON.parse(user);
    } catch (error) {
      console.error('Error al parsear el usuario de la sesión:', error);
      this.limpiarSesionLocal();
      return null;
    }
  }

  obtenerToken(): string | null {
    return localStorage.getItem('tokenAcceso');
  }

  estaLogueado(): boolean {
    return this.obtenerUsuarioSesion() !== null;
  }

  limpiarSesionLocal() {
    localStorage.removeItem('usuarioLogueado');
    localStorage.removeItem('tokenAcceso');
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
}