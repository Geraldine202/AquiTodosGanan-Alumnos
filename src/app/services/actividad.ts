import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ==========================================
// INTERFACES Y MODELOS (NIVELES)
// ==========================================

export interface Nivel {
  id_nivel: number;
  nombre_nivel: string;
  min_actividades: number;
}

export interface InfoNivelUsuario {
  id_nivel: number;
  nombre_nivel: string;
  total_actividades: number;
  faltantes_siguiente?: number;
}

// ==========================================
// INTERFACES Y MODELOS (ACTIVIDADES)
// ==========================================

export interface ConteoActividades {
  rut_usuario: string;
  total_actividades: number;
}

export interface ReprogramarActividadDTO {
  fecha: string;        // Formato YYYY-MM-DD
  hora_inicio: string;  // Formato HH:MM:SS
  hora_termino: string; // Formato HH:MM:SS
}

export interface ActividadPayload {
  nombre_actividad: string;
  descripcion: string;
  responsable_actividad: string;
  rut_usuario: string;
  id_tipo_actividad: number;
  id_estado_actividad?: number;
  id_sede: number;
  fecha: string;        // Formato YYYY-MM-DD
  hora_inicio: string;  // Formato HH:mm:ss
  hora_termino: string; // Formato HH:mm:ss
  puntos: number;
  cupos: number;
  lugar: string;
  requisito?: string;
  img_actv?: string;
}

export interface ActividadCompleta {
  id_actividad: number;
  nombre_actividad: string;
  descripcion: string;
  responsable_actividad: string;
  fecha: string;
  hora_inicio: string;
  hora_termino: string;
  id_tipo_actividad: number;
  id_estado_actividad: number;
  id_sede: number;
  rut_usuario: string;
  img_actv?: string;
  tipo_actividad?: { descripcion: string };
  estado_actividad?: { descripcion: string };
  sede?: { descripcion: string };
  usuario?: { nombre_completo: string; correo: string };
  puntaje_act?: Array<{ id_puntaje: number; cantidad: number; fecha_vencimiento: string }>;
  cupo_actividad?: Array<{ id_cupo: number; cantidad: number }>;
  lugar_actividad?: Array<{ id_lugar_actividad: number; descripcion: string }>;
  requisito_participacion?: Array<{ id_requisito: number; descripcion: string }>;
  calendario?: Array<{ id_calendario: number; fecha: string; hora: string; lugar: string }>;
}

export interface EstudianteAsistencia {
  rut_usuario: string;
  presente: boolean;
}

export interface AsistenciaPayload {
  estudiantes?: EstudianteAsistencia[];
  asistencia?: EstudianteAsistencia[];
}

export interface EstudianteInscrito {
  rut: string;
  nombre: string;
  asistio: boolean;
}

export interface ResumenListaInscritos {
  id_actividad: number;
  nombre_actividad: string;
  total_inscritos: number;
  total_asistentes: number;
  estudiantes: EstudianteInscrito[];
}

export interface InscripcionCreate {
  rut_alumno: string; 
  id_actividad: number;
}

export interface InscripcionRespuesta {
  mensaje: string;
  cupos_restantes?: number;
  inscripcion: {
    id_inscripcion: number;
    rut_usuario: string;
    id_actividad: number;
    puntos_ganados: number;
    fecha_inscripcion: string;
    fecha_termino: string;
  };
}

export interface InscripcionDetalle {
  id_inscripcion: number;
  rut_usuario: string;
  id_actividad: number;
  puntos_ganados: number;
  fecha_inscripcion: string;
  fecha_termino: string;
  actividad?: ActividadCompleta;
}

// ==========================================
// INTERFACES Y MODELOS (PREMIOS Y CANJES)
// ==========================================

export interface CategoriaPremio {
  id_categoria: number;
  descripcion: string;
}

export interface PremioPayload {
  descripcion: string;
  valor?: number;
  puntos_requeridos: number;
  id_categoria: number;
  rut_usuario: string;
  id_sede: number;
  id_nivel?: number;
  estado_visibilidad?: boolean;
  imagen?: string;
  stock?: number;
}

export interface PremioCompleto {
  id_premio: number;
  descripcion: string;
  valor?: number;
  puntos_requeridos: number;
  id_categoria: number;
  rut_usuario: string;
  id_sede: number;
  id_nivel?: number;
  nombre_nivel?: string;
  estado_visibilidad: boolean;
  imagen?: string;
  categoria_premio?: CategoriaPremio;
  sede?: { id_sede?: number; descripcion: string };
  usuario?: { nombre_completo: string; correo: string };
  nivel?: Nivel;
  desbloqueado?: boolean;
  info_nivel_usuario?: InfoNivelUsuario;
  stock_sede?: Array<{ id_stock: number; cantidad: number; id_sede: number }>;
}

export interface SolicitudCanjePayload {
  rut_alumno?: string;
  rut_usuario?: string;
  id_premio: number;
  id_sede?: number;
  lugar_entrega?: string;
}

export interface SolicitudCanjeRespuesta {
  mensaje: string;
  saldo_restante: number;
  id_canje: number;
}

export interface SolicitudCanje {
  id_canje: number;
  id_solicitud?: number;
  rut_usuario: string;
  costo_puntaje: number;
  fecha_solicitud: string;
  id_estado_canje: number;

  nombre_sede_alumno?: string;
  stock_sede_alumno?: number;
  info_nivel_usuario?: InfoNivelUsuario;

  usuario?: {
    rut_usuario: string;
    nombre_completo: string;
    id_sede: number;
    correo?: string;
    sede?: {
      id_sede: number;
      descripcion: string;
    } | Array<{ id_sede: number; descripcion: string }>;
  };

  premio?: PremioCompleto;

  estado_canje?: {
    id_estado_canje: number;
    descripcion: string;
  };

  retiro_premio?: {
    id_retiro?: number;
    fecha_limite?: string;
    retirado?: boolean;
    id_canje?: number;
  };
}

export interface PremioStockBajo {
  cantidad: number;
  premio: {
    id_premio: number;
    descripcion: string;
  };
  sede: {
    descripcion: string;
  };
}

// ==========================================
// CATÁLOGOS Y USUARIOS
// ==========================================

export interface CatalogoItem {
  id_tipo_actividad?: number;
  id_estado_actividad?: number;
  id_sede?: number;
  descripcion: string;
}

export interface Docente {
  rut_usuario: string;
  nombre_completo: string;
  correo: string;
  id_tipo_usuario?: number;
}

export interface Consejero {
  rut_usuario: string;
  nombre_completo: string;
  correo: string;
  id_tipo_usuario?: number;
}

export interface PuntajeTotalResponse {
  id_puntaje?: number;
  rut_usuario: string;
  puntaje: number;
  vigencia?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ActividadService {

  private apiUrl: string = 'http://localhost:8000';

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  // ==========================================
  // ARCHIVOS / ALMACENAMIENTO DE IMÁGENES
  // ==========================================

  subirImagen(
    file: File, 
    bucket: 'actividad' | 'premio' | 'premios' | string = 'actividad'
  ): Observable<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);

    return this.http.post<{ url: string; filename: string }>(
      `${this.apiUrl}/upload-imagen`,
      formData
    );
  }

  // ==========================================
  // CATÁLOGOS Y USUARIO
  // ==========================================

  getDocentes(): Observable<Docente[]> {
    return this.http.get<Docente[]>(`${this.apiUrl}/docentes`);
  }

  getConsejeros(): Observable<Consejero[]> {
    return this.http.get<Consejero[]>(`${this.apiUrl}/consejeros`);
  }

  getUsuarioSesion(rutOToken: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/usuario/sesion/${rutOToken}`);
  }

  getPuntajeTotal(rutOToken: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/puntaje-total/${rutOToken}`);
  }

  getTiposActividad(): Observable<CatalogoItem[]> {
    return this.http.get<CatalogoItem[]>(`${this.apiUrl}/tipos-actividad`);
  }

  getEstadosActividad(): Observable<CatalogoItem[]> {
    return this.http.get<CatalogoItem[]>(`${this.apiUrl}/estados-actividad`);
  }

  getCategoriasPremio(): Observable<CategoriaPremio[]> {
    return this.http.get<CategoriaPremio[]>(`${this.apiUrl}/categorias-premio`);
  }

  getNiveles(): Observable<Nivel[]> {
    return this.http.get<Nivel[]>(`${this.apiUrl}/niveles`);
  }

  getSedes(): Observable<CatalogoItem[]> {
    return this.http.get<CatalogoItem[]>(`${this.apiUrl}/sedes`);
  }

  getNivelUsuario(rutOToken: string): Observable<InfoNivelUsuario> {
    return this.http.get<InfoNivelUsuario>(`${this.apiUrl}/usuarios/nivel/${rutOToken}`);
  }

  getResponsablesActivos(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:3000/responsables-activos');
  }

  // ==========================================
  // CRUD Y GESTIÓN DE ACTIVIDADES
  // ==========================================

  getActividades(): Observable<ActividadCompleta[]> {
    return this.http.get<ActividadCompleta[]>(`${this.apiUrl}/actividades`);
  }

  getConteoActividadesPorUsuario(rutUsuario: string): Observable<ConteoActividades> {
    return this.http.get<ConteoActividades>(`${this.apiUrl}/actividades/conteo/usuario/${rutUsuario}`);
  }

  getActividadesPorUsuario(rutUsuario: string): Observable<ActividadCompleta[]> {
    return this.http.get<ActividadCompleta[]>(`${this.apiUrl}/actividades/usuario/${rutUsuario}`);
  }

  getActividadesPorSede(rutOToken: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/actividades/disponibles/${rutOToken}`);
  }

  getActividadPorId(id: number): Observable<ActividadCompleta> {
    return this.http.get<ActividadCompleta>(`${this.apiUrl}/actividades/${id}`);
  }

  crearActividad(actividad: ActividadPayload): Observable<ActividadCompleta> {
    return this.http.post<ActividadCompleta>(`${this.apiUrl}/actividades`, actividad, this.httpOptions);
  }

  actualizarActividad(id: number, actividad: Partial<ActividadPayload>): Observable<ActividadCompleta> {
    return this.http.put<ActividadCompleta>(`${this.apiUrl}/actividades/${id}`, actividad, this.httpOptions);
  }

  eliminarActividad(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.apiUrl}/actividades/${id}`);
  }

  iniciarActividad(idActividad: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/actividades/${idActividad}/iniciar`, {});
  }

  terminarActividad(idActividad: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/actividades/${idActividad}/terminar`, {});
  }

  reprogramarActividad(idActividad: number, datos: ReprogramarActividadDTO): Observable<any> {
    return this.http.put(`${this.apiUrl}/actividades/${idActividad}/reprogramar`, datos);
  }

  // ==========================================
  // INSCRIPCIONES Y ASISTENCIA
  // ==========================================

  getEstudiantesInscritos(idActividad: number): Observable<ResumenListaInscritos> {
    return this.http.get<ResumenListaInscritos>(`${this.apiUrl}/actividades/${idActividad}/lista-inscritos`);
  }

  getInscritosActividad(idActividad: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/actividades/${idActividad}/inscritos`);
  }

  obtenerInscritos(idActividad: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/actividades/${idActividad}/inscritos`);
  }

  inscribirAlumno(payload: InscripcionCreate): Observable<InscripcionRespuesta> {
    return this.http.post<InscripcionRespuesta>(`${this.apiUrl}/inscripciones`, payload, this.httpOptions);
  }

  cancelarInscripcion(rutAlumno: string, idActividad: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/inscripciones`, {
      params: {
        rut_alumno: rutAlumno,
        id_actividad: idActividad.toString()
      }
    });
  }

  registrarAsistenciaMasiva(
    idActividad: number, 
    estudiantes: EstudianteAsistencia[]
  ): Observable<{ mensaje: string; actualizados: number }> {
    return this.http.post<{ mensaje: string; actualizados: number }>(
      `${this.apiUrl}/actividades/${idActividad}/asistencia`, 
      { estudiantes },
      this.httpOptions
    );
  }

  completarActividad(rutAlumno: string, idActividad: number): Observable<{ mensaje: string; puntos_sumados: number }> {
    return this.http.put<{ mensaje: string; puntos_sumados: number }>(
      `${this.apiUrl}/inscripciones/completar?rut_alumno=${rutAlumno}&id_actividad=${idActividad}`,
      {},
      this.httpOptions
    );
  }

  getInscripcionesPorAlumno(rutOToken: string): Observable<InscripcionDetalle[]> {
    const rutFormateado = rutOToken.replace(/\./g, '');
    return this.http.get<InscripcionDetalle[]>(
      `${this.apiUrl}/inscripciones/alumno/${encodeURIComponent(rutFormateado)}`
    );
  }

  obtenerInscripcionesPorUsuario(rutOToken: string): Observable<InscripcionDetalle[]> {
    return this.getInscripcionesPorAlumno(rutOToken);
  }

  obtenerActividadesCompletadas(rutUsuario: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/alumnos/${rutUsuario}/actividades-completadas`);
  }

  responderEncuesta(payload: { 
    id_actividad: number; 
    id_inscripcion: number; 
    calificacion: number; 
    comentario?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/encuestas`, payload);
  }

  enviarCertificadoCorreo(payload: { rut_usuario: string; id_actividad: number }): Observable<any> {
    return this.http.post(`${this.apiUrl}/certificados/enviar-correo`, payload);
  }

  getNotificacionesAlumno(rutOToken: string): Observable<any[]> {
    const rutFormateado = rutOToken.replace(/\./g, '');
    return this.http.get<any[]>(
      `${this.apiUrl}/notificaciones/usuario/${encodeURIComponent(rutFormateado)}`
    );
  }

  // ==========================================
  // CRUD DE PREMIOS Y CANJES (ALUMNO + ADMIN)
  // ==========================================

  getPremios(rutUsuario?: string): Observable<PremioCompleto[]> {
    let params = new HttpParams();
    if (rutUsuario) {
      params = params.set('rut_usuario', rutUsuario);
    }
    return this.http.get<PremioCompleto[]>(`${this.apiUrl}/premios`, { params });
  }

  getPremioPorId(id: number, rutUsuario?: string): Observable<PremioCompleto> {
    let params = new HttpParams();
    if (rutUsuario) {
      params = params.set('rut_usuario', rutUsuario);
    }
    return this.http.get<PremioCompleto>(`${this.apiUrl}/premios/${id}`, { params });
  }

  crearPremio(premio: PremioPayload): Observable<PremioCompleto> {
    return this.http.post<PremioCompleto>(`${this.apiUrl}/premios`, premio, this.httpOptions);
  }

  actualizarPremio(id: number, premio: Partial<PremioPayload>): Observable<PremioCompleto> {
    return this.http.put<PremioCompleto>(`${this.apiUrl}/premios/${id}`, premio, this.httpOptions);
  }

  eliminarPremio(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.apiUrl}/premios/${id}`);
  }

  getSolicitudesCanje(): Observable<SolicitudCanje[]> {
    return this.http.get<SolicitudCanje[]>(`${this.apiUrl}/solicitudes-canje`);
  }

  crearSolicitudCanje(solicitud: SolicitudCanjePayload): Observable<SolicitudCanje> {
    return this.http.post<SolicitudCanje>(`${this.apiUrl}/solicitudes-canje`, solicitud, this.httpOptions);
  }

  actualizarEstadoCanje(idCanje: number, estado: string): Observable<SolicitudCanje> {
    return this.http.put<SolicitudCanje>(
      `${this.apiUrl}/solicitudes-canje/${idCanje}`, 
      { estado }, 
      this.httpOptions
    );
  }

  canjearPremio(payload: SolicitudCanjePayload): Observable<SolicitudCanjeRespuesta> {
    return this.http.post<SolicitudCanjeRespuesta>(
      `${this.apiUrl}/premios/canjear`,
      payload,
      this.httpOptions
    );
  }

  getHistorialPuntos(rut: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/puntos/historial/${rut}`);
  }

  getMisCanjes(rut: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/premios/mis-canjes/${rut}`);
  }

  getSolicitudesCanjeUsuario(rutUsuario: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/premios/mis-canjes/${rutUsuario}`);
  }

  cancelarSolicitudCanje(payload: { rut_alumno: string; id_premio: number }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/solicitud-canje/cancelar`, payload);
  }

  // MÉTODOS DEL PANEL ADMINISTRATIVO DE CANJES
  obtenerCanjes(): Observable<SolicitudCanje[]> {
    return this.http.get<SolicitudCanje[]>(`${this.apiUrl}/premios/solicitudes`);
  }
  // Obtener solicitudes a cargo de un docente / consejero en específico
obtenerCanjesPorResponsable(rutResponsable: string): Observable<SolicitudCanje[]> {
  return this.http.get<SolicitudCanje[]>(`${this.apiUrl}/premios/solicitudes/responsable/${rutResponsable}`);
}

  aprobarCanje(idCanje: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/premios/aprobar/${idCanje}`, {}, this.httpOptions);
  }

  marcarComoRetirado(idCanje: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/premios/marcar-retirado/${idCanje}`, {}, this.httpOptions);
  }

  cancelarPorStock(idCanje: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/premios/cancelar/${idCanje}`, {}, this.httpOptions);
  }

  obtenerPremiosStockBajo(limiteCritico: number = 3): Observable<PremioStockBajo[]> {
    return this.http.get<PremioStockBajo[]>(`${this.apiUrl}/premios/stock-bajo?limite_critico=${limiteCritico}`);
  }
}