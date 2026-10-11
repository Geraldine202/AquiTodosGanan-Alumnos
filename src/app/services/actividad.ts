import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
// ==========================================
// INTERFACES Y MODELOS (ACTIVIDADES)
// ==========================================

/** Respuesta del endpoint para el conteo de actividades de un usuario */
export interface ConteoActividades {
  rut_usuario: string;
  total_actividades: number;
}
export interface ReprogramarActividadDTO {
  fecha: string;        // Formato YYYY-MM-DD
  hora_inicio: string;  // Formato HH:MM:SS
  hora_termino: string; // Formato HH:MM:SS
}

/** Payload que el Frontend debe enviar para crear una Actividad según el esquema SQL */
export interface ActividadPayload {
  nombre_actividad: string;
  descripcion: string;
  responsable_actividad: string;
  rut_usuario: string;
  id_tipo_actividad: number;
  id_estado_actividad?: number; // FastAPI asigna 1 por defecto al crear
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
export interface Nivel {
  id_nivel: number;
  nombre_nivel: string;
  min_actividades: number;
}
/** Payload para inscribir a un alumno en una actividad */
export interface InscripcionCreate {
  rut_alumno: string; 
  id_actividad: number;
}
export interface InfoNivelUsuario {
  id_nivel: number;
  nombre_nivel: string;
  total_actividades: number;
  faltantes_siguiente?: number;
}
export interface ResumenListaInscritos {
  id_actividad: number;
  nombre_actividad: string;
  total_inscritos: number;
  total_asistentes: number;
  estudiantes: EstudianteInscrito[];
}
export interface EstudianteInscrito {
  rut: string;
  nombre: string;
  asistio: boolean;
}
/** Respuesta de la API tras una inscripción */
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

/** Estructura detallada de un registro de inscripción con actividad y tablas hijas anidadas */
export interface InscripcionDetalle {
  id_inscripcion: number;
  rut_usuario: string;
  id_actividad: number;
  puntos_ganados: number;
  fecha_inscripcion: string;
  fecha_termino: string;
  actividad?: ActividadCompleta;
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

// ==========================================
// INTERFACES Y MODELOS (PREMIOS Y CANJES)
// ==========================================

/** Payload necesario para Crear o Actualizar un Premio */
export interface PremioPayload {
  descripcion: string;
  valor?: number;
  puntos_requeridos: number;
  id_categoria: number;
  rut_usuario: string;
  id_sede: number;
  estado_visibilidad?: boolean;
  imagen?: string;
  stock?: number;
}

/** Respuesta completa de Premio enviada por la API (con relaciones) */
export interface PremioCompleto {
  id_premio: number;
  descripcion: string;
  valor: number;
  puntos_requeridos: number;
  id_categoria: number;
  rut_usuario: string;
  id_sede: number;
  estado_visibilidad: boolean;
  imagen?: string;
  categoria_premio?: { id_categoria?: number; descripcion: string };
  sede?: { id_sede?: number; descripcion: string };
  usuario?: { nombre_completo: string; correo: string };
  stock_sede?: Array<{ id_stock: number; cantidad: number; id_sede: number }>;
}

/** Payload necesario para solicitar un Canje de Premio */

/** Respuesta de una Solicitud de Canje */
export interface SolicitudCanje {
  id_solicitud?: number;
  id_canje?: number;
  rut_usuario: string;
  id_premio: number;
  id_sede: number;
  fecha_solicitud?: string;
  estado?: string;
  premio?: PremioCompleto;
  usuario?: { nombre_completo: string; correo: string };
}

// ==========================================
// INTERFACES DE CATÁLOGOS Y USUARIOS
// ==========================================

/** Interfaz para ítems de catálogos simples (Sedes, Tipos, Estados) */
export interface CatalogoItem {
  id_tipo_actividad?: number;
  id_estado_actividad?: number;
  id_sede?: number;
  descripcion: string;
}

/** Interfaz para categorías de premio */
export interface CategoriaPremio {
  id_categoria: number;
  descripcion: string;
}

/** Interfaz para el catálogo de Docentes/Usuarios */
export interface Docente {
  rut_usuario: string;
  nombre_completo: string;
  correo: string;
  id_tipo_usuario?: number;
}

/** Interfaz para Consejeros de Carrera */
export interface Consejero {
  rut_usuario: string;
  nombre_completo: string;
  correo: string;
  id_tipo_usuario?: number;
}
/** Interfaz para el resumen de puntaje total del alumno */
export interface PuntajeTotalResponse {
  id_puntaje?: number;
  rut_usuario: string;
  puntaje: number;
  vigencia?: string;
}
export interface SolicitudCanjePayload {
  rut_alumno?: string;
  rut_usuario?: string;
  id_premio: number;
  id_sede?: number;
  lugar_entrega?: string;
}

/** Respuesta enviada por el endpoint POST /premios/canjear */
export interface SolicitudCanjeRespuesta {
  mensaje: string;
  saldo_restante: number;
  id_canje: number;
}

export interface EstudianteAsistencia {
  rut_usuario: string;
  presente: boolean;
}
export interface AsistenciaPayload {
  estudiantes?: EstudianteAsistencia[];
  asistencia?: EstudianteAsistencia[];
}
export interface ResumenListaInscritos {
  id_actividad: number;
  nombre_actividad: string;
  total_inscritos: number;
  total_asistentes: number;
  estudiantes: EstudianteInscrito[];
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
  // CATÁLOGOS COMPARTIDOS
  // ==========================================

  getDocentes(): Observable<Docente[]> {
    return this.http.get<Docente[]>(`${this.apiUrl}/docentes`);
  }


  getUsuarioSesion(rutOToken: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/usuario/sesion/${rutOToken}`);
  }
  getPuntajeTotal(rutOToken: string) {
    return this.http.get<any>(`${this.apiUrl}/puntaje-total/${rutOToken}`);
  }

  getConsejeros(): Observable<Consejero[]> {
    return this.http.get<Consejero[]>(`${this.apiUrl}/consejeros`);
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
  getActividadesPorSede(rutOToken: string) {
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

  // ==========================================
  // INSCRIPCIONES A ACTIVIDADES
  // ==========================================

  /**
   * Inscribe a un alumno en una actividad (Valida matrícula, previene duplicados y descuenta cupo)
   */
    /** Obtiene la lista completa de inscritos y conteo de asistentes */
  getEstudiantesInscritos(idActividad: number): Observable<ResumenListaInscritos> {
    return this.http.get<ResumenListaInscritos>(`${this.apiUrl}/actividades/${idActividad}/lista-inscritos`);
  }
  inscribirAlumno(payload: InscripcionCreate): Observable<InscripcionRespuesta> {
    return this.http.post<InscripcionRespuesta>(`${this.apiUrl}/inscripciones`, payload, this.httpOptions);
  }
    getInscritosActividad(idActividad: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/actividades/${idActividad}/inscritos`);
  }
  cancelarInscripcion(rutAlumno: string, idActividad: number) {
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


  /**
   * Marca la actividad de un alumno como COMPLETADA y le acredita el puntaje en 'puntaje_total'
   */
  completarActividad(rutAlumno: string, idActividad: number): Observable<{ mensaje: string; puntos_sumados: number }> {
    return this.http.put<{ mensaje: string; puntos_sumados: number }>(
      `${this.apiUrl}/inscripciones/completar?rut_alumno=${rutAlumno}&id_actividad=${idActividad}`,
      {},
      this.httpOptions
    );
  }

  /**
   * Obtiene la lista de inscripciones/actividades cursadas por un alumno mediante su RUT o Token
   */
getInscripcionesPorAlumno(rutOToken: string): Observable<InscripcionDetalle[]> {
  // Limpia los puntos antes de realizar el GET para evitar fallos de formateo en FastAPI
  const rutFormateado = rutOToken.replace(/\./g, '');
  return this.http.get<InscripcionDetalle[]>(
    `${this.apiUrl}/inscripciones/alumno/${encodeURIComponent(rutFormateado)}`
  );
}
  /**
   * Alias de compatibilidad para consultar inscripciones
   */
  obtenerInscripcionesPorUsuario(rutOToken: string): Observable<InscripcionDetalle[]> {
    return this.getInscripcionesPorAlumno(rutOToken);
  }

  // ==========================================
  // CRUD DE PREMIOS Y CANJES
  // ==========================================

  getPremios(): Observable<PremioCompleto[]> {
    return this.http.get<PremioCompleto[]>(`${this.apiUrl}/premios`);
  }

  getPremioPorId(id: number): Observable<PremioCompleto> {
    return this.http.get<PremioCompleto>(`${this.apiUrl}/premios/${id}`);
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

// En src/app/services/actividad.ts

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
 
  getNivelUsuario(rutOToken: string): Observable<InfoNivelUsuario> {
      return this.http.get<InfoNivelUsuario>(`${this.apiUrl}/usuarios/nivel/${rutOToken}`);
    }

      iniciarActividad(idActividad: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/actividades/${idActividad}/iniciar`, {});
  }

  /** Detener / Finalizar actividad manualmente y liquidar puntos */
  terminarActividad(idActividad: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/actividades/${idActividad}/terminar`, {});
  }
   /** Reprogramar actividad si finalizó sin inscritos */
  reprogramarActividad(idActividad: number, datos: ReprogramarActividadDTO): Observable<any> {
    return this.http.put(`${this.apiUrl}/actividades/${idActividad}/reprogramar`, datos);
  }
    obtenerInscritos(idActividad: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/actividades/${idActividad}/inscritos`);
  }

}