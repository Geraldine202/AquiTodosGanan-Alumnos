import { Component, OnInit, ViewChild } from '@angular/core';
import { IonModal, ToastController, AlertController } from '@ionic/angular';
import { 
  ActividadService, 
  ActividadPayload, 
  ResumenListaInscritos, 
  EstudianteAsistencia 
} from '../../services/actividad';
import { AlumnoService } from 'src/app/services/alumno';

export interface FormularioActividad {
  nombre_actividad: string;
  descripcion: string;
  responsable_actividad: string;
  rut_usuario: string;
  id_tipo_actividad: number | null;
  id_estado_actividad: number | null;
  id_sede: number | null;
  fecha: string;        // 'YYYY-MM-DD'
  hora_inicio: string;  // 'HH:mm'
  hora_termino: string; // 'HH:mm'
  puntos: number | null;
  cupos: number | null;
  lugar: string;
  requisito: string;
  img_actv: string;
}

@Component({
  selector: 'app-admin-actividades',
  templateUrl: './admin-actividades.page.html',
  styleUrls: ['./admin-actividades.page.scss'],
  standalone: false
})
export class AdminActividadesPage implements OnInit {
  @ViewChild('modalDocentes') modalDocentes!: IonModal;
  @ViewChild('modalDetalles') modalDetalles!: IonModal;

  readonly imgDefault: string = '../../../assets/image_38683be5.png';

  modoFormulario: 'agregar' | 'editar' = 'agregar';
  modoReprogramacionModal: boolean = false;
  busquedaActividad: string = '';
  busquedaDocente: string = '';
  idActividadSeleccionada: number | null = null;
  
  cargandoImagen: boolean = false;
  cargandoAsistencia: boolean = false;
  cargandoGuardado: boolean = false;

  pestanaSeleccionada: 'vigentes' | 'finalizadas' = 'vigentes';

  // Variables para gestión de asistencia e inscritos en tiempo real
  actividadSeleccionadaModal: any = null;
  listaEstudiantesInscritos: any[] = [];
  resumenInscritos: ResumenListaInscritos | null = null;
  cargandoInscritos: boolean = false;

  usuarioLogueado: any = null;
  esConsejero: boolean = false;
  esAdmin: boolean = false;

  listaActividades: any[] = [];
  actividadesFiltradas: any[] = [];
  listaDocentes: any[] = [];
  docentesFiltrados: any[] = [];
  listaTipos: any[] = [];
  listaEstados: any[] = [];
  listaSedes: any[] = [];

  formulario: FormularioActividad = {
    nombre_actividad: '',
    descripcion: '',
    responsable_actividad: '',
    rut_usuario: '',
    id_tipo_actividad: null,
    id_estado_actividad: 1,
    id_sede: null,
    fecha: '',
    hora_inicio: '',
    hora_termino: '',
    puntos: null,
    cupos: null,
    lugar: '',
    requisito: '',
    img_actv: ''
  };

  formularioEdicion: FormularioActividad = { ...this.formulario };

  constructor(
    private actividadService: ActividadService,
    private alumnoService: AlumnoService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.escucharUsuario();
  }

  ionViewWillEnter() {
    this.cargarCatalogos();
    this.cargarActividades();
  }

  escucharUsuario() {
    this.alumnoService.usuario$.subscribe(usuario => {
      this.usuarioLogueado = usuario;

      if (this.usuarioLogueado) {
        const tipoUser = Number(
          this.usuarioLogueado?.id_tipo_usuario ?? 
          this.usuarioLogueado?.tipo_usuario?.id_tipo_usuario ?? 
          this.usuarioLogueado?.id_rol ?? 
          1
        );

        this.esAdmin = (tipoUser === 2);
        this.esConsejero = (tipoUser === 3 || tipoUser === 4);

        if (this.listaActividades.length > 0) {
          this.filtrarActividades();
        }
      }
    });
  }

  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = this.imgDefault;
  }

  cargarCatalogos() {
    this.actividadService.getSedes().subscribe({
      next: (data: any) => {
        const sedesRaw = Array.isArray(data) ? data : (data?.data || []);
        this.listaSedes = sedesRaw.map((s: any) => ({
          id_sede: Number(s.id_sede ?? s.id ?? 1),
          descripcion: s.descripcion || s.nombre_sede || 'Sede sin nombre'
        }));
      },
      error: (err) => console.error('Error al cargar sedes:', err)
    });

    this.actividadService.getTiposActividad().subscribe({
      next: (data: any) => {
        const tiposRaw = Array.isArray(data) ? data : (data?.data || []);
        this.listaTipos = tiposRaw.map((t: any) => ({
          id_tipo_actividad: Number(t.id_tipo_actividad ?? t.id ?? 1),
          descripcion: t.descripcion || t.nombre_tipo || 'Sin tipo'
        }));
      },
      error: (err: any) => console.error('Error al cargar tipos:', err)
    });

    this.actividadService.getEstadosActividad().subscribe({
      next: (data: any) => {
        const estadosRaw = Array.isArray(data) ? data : (data?.data || []);
        this.listaEstados = estadosRaw.map((e: any) => ({
          id_estado_actividad: Number(e.id_estado_actividad ?? e.id ?? 1),
          descripcion: e.descripcion || 'Sin estado'
        }));
      },
      error: (err: any) => console.error('Error al cargar estados:', err)
    });

    this.cargarDocentesYConsejeros();
  }

  cargarDocentesYConsejeros() {
    this.actividadService.getDocentes().subscribe({
      next: (dataDocentes: any) => {
        const docentesRaw = Array.isArray(dataDocentes) ? dataDocentes : (dataDocentes?.data || []);
        const docentesProcesados = docentesRaw.map((doc: any) => ({
          ...doc,
          rut_usuario: doc.rut_usuario || doc.rut || 'S/R',
          nombre_completo: doc.nombre_completo || `${doc.p_nombre || ''} ${doc.p_apellido || ''}`.trim()
        }));

        this.actividadService.getConsejeros().subscribe({
          next: (dataConsejeros: any) => {
            const consejerosRaw = Array.isArray(dataConsejeros) ? dataConsejeros : (dataConsejeros?.data || []);
            const consejerosProcesados = consejerosRaw.map((c: any) => ({
              ...c,
              rut_usuario: c.rut_usuario || c.rut || 'S/R',
              nombre_completo: c.nombre_completo || `${c.p_nombre || ''} ${c.p_apellido || ''}`.trim()
            }));

            const mapaUsuarios = new Map();
            [...docentesProcesados, ...consejerosProcesados].forEach(u => mapaUsuarios.set(u.rut_usuario, u));
            this.listaDocentes = Array.from(mapaUsuarios.values());
            this.docentesFiltrados = [...this.listaDocentes];
          },
          error: () => {
            this.listaDocentes = docentesProcesados;
            this.docentesFiltrados = [...this.listaDocentes];
          }
        });
      },
      error: (err: any) => console.error('Error al cargar docentes:', err)
    });
  }

  cargarActividades() {
    this.actividadService.getActividades().subscribe({
      next: (data: any) => {
        this.listaActividades = Array.isArray(data) ? data : (data?.data || []);
        this.filtrarActividades();
      },
      error: () => this.mostrarToast('Error al cargar la lista de actividades', 'danger')
    });
  }

  // =====================================================================
  // EVALUADORES DE ESTADO Y REGLAS DE NEGOCIO
  // =====================================================================

  /**
   * Verifica si la actividad tiene alumnos inscritos activos
   */
tieneInscritos(act: any): boolean {
  if (!act) return false;

  // 1. Revisar si viene un conteo numérico explicito desde el backend
  if (act.total_inscritos !== undefined && act.total_inscritos !== null) {
    return Number(act.total_inscritos) > 0;
  }
  if (act.cant_inscritos !== undefined && act.cant_inscritos !== null) {
    return Number(act.cant_inscritos) > 0;
  }

  // 2. Extraer cualquier propiedad posible donde Supabase o FastAPI devuelvan la lista
  const inscritosRaw = 
    act.inscripcion_act ?? 
    act.inscripciones ?? 
    act.inscripcion ?? 
    act.inscritos ?? 
    act.asistencia_act ?? 
    [];

  if (Array.isArray(inscritosRaw)) {
    return inscritosRaw.length > 0;
  } 
  
  if (typeof inscritosRaw === 'number') {
    return inscritosRaw > 0;
  }

  return false;
}
  esProgramada(act: any): boolean {
    if (!act) return false;
    const estadoId = Number(act?.id_estado_actividad ?? act?.estado_actividad?.id_estado_actividad ?? 1);
    const desc = (act?.estado_actividad?.descripcion || act?.estado || '').toLowerCase();
    
    return estadoId === 1 || desc.includes('programada');
  }

  esEnCurso(act: any): boolean {
    if (!act) return false;
    const estadoId = Number(act.id_estado_actividad ?? act.estado_actividad?.id_estado_actividad ?? 1);
    const desc = (act.estado_actividad?.descripcion || act.estado || '').toLowerCase();

    return estadoId === 2 || desc.includes('en curso');
  }

  esFinalizada(act: any): boolean {
    if (!act) return false;
    const estadoId = Number(act.id_estado_actividad ?? act.estado_actividad?.id_estado_actividad ?? 1);
    const desc = (act.estado_actividad?.descripcion || act.estado || '').toLowerCase();
    
    return estadoId === 3 || estadoId === 4 || desc.includes('finalizad') || desc.includes('cancelad') || desc.includes('terminad');
  }

  puedeReprogramar(act: any): boolean {
    if (!act) return false;

    if (act.puede_reprogramar !== undefined) {
      return Boolean(act.puede_reprogramar);
    }

    if (this.tieneInscritos(act)) {
      return false;
    }

    if (!act.fecha || !act.hora_termino) return false;
    const fechaBase = act.fecha.split('T')[0];
    const horaTermino = act.hora_termino.slice(0, 8);
    const dtTermino = new Date(`${fechaBase}T${horaTermino}`);

    const estaVencidaOFinalizada = new Date() >= dtTermino || this.esFinalizada(act);

    return estaVencidaOFinalizada && !this.tieneInscritos(act);
  }

  private normalizarRut(rut: string | null | undefined): string {
    if (!rut) return '';
    return String(rut).replace(/[^0-9kK]/g, '').toLowerCase().trim();
  }

  filtrarActividades() {
    const q = this.busquedaActividad ? this.busquedaActividad.toLowerCase().trim() : '';
    const rutUsuarioStorage = localStorage.getItem('rut_usuario') || localStorage.getItem('rut') || '';
    const rutSesionRaw = this.usuarioLogueado?.rut_usuario || this.usuarioLogueado?.rut || rutUsuarioStorage || '';
    const rutSesion = this.normalizarRut(rutSesionRaw);

    this.actividadesFiltradas = this.listaActividades.filter(act => {
      if (!this.esAdmin && rutSesion !== '') {
        const rutResponsableRaw = act.rut_usuario || act.usuario?.rut_usuario || act.rut_docente || '';
        const rutResponsable = this.normalizarRut(rutResponsableRaw);
        if (rutResponsable && rutResponsable !== rutSesion) return false;
      }

      const esFinal = this.esFinalizada(act);
      const coincidePestana = this.pestanaSeleccionada === 'vigentes' ? !esFinal : esFinal;
      const coincideBusqueda = !q || 
        (act.nombre_actividad && act.nombre_actividad.toLowerCase().includes(q)) ||
        (act.responsable_actividad && act.responsable_actividad.toLowerCase().includes(q));

      return coincidePestana && coincideBusqueda;
    });
  }

  // =====================================================================
  // ACCIONES HTTP: INICIAR, TERMINAR, REPROGRAMAR
  // =====================================================================

  async iniciarActividadAdmin(act: any) {
    const alert = await this.alertController.create({
      header: 'Iniciar Actividad',
      message: `¿Deseas poner en curso "${act.nombre_actividad}"? Se habilitará la toma de asistencia inmediata.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Sí, Iniciar',
          handler: () => {
            this.actividadService.iniciarActividad(act.id_actividad).subscribe({
              next: () => {
                this.mostrarToast('Actividad puesta En Curso exitosamente', 'success');
                act.id_estado_actividad = 2;
                if (!act.estado_actividad) act.estado_actividad = {};
                act.estado_actividad.descripcion = 'En Curso';
                
                this.cargarActividades();
              },
              error: (err) => {
                const msg = err.error?.detail || 'No se pudo iniciar la actividad.';
                this.mostrarToast(msg, 'danger');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async terminarActividadAdmin(act: any) {
    const alert = await this.alertController.create({
      header: 'Finalizar Actividad',
      message: `¿Deseas finalizar "${act.nombre_actividad}"? Se liquidarán los puntos a los alumnos que registraron asistencia.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Sí, Finalizar',
          handler: () => {
            this.actividadService.terminarActividad(act.id_actividad).subscribe({
              next: () => {
                this.mostrarToast('Actividad finalizada y puntos liquidados', 'success');
                act.id_estado_actividad = 3;
                if (!act.estado_actividad) act.estado_actividad = {};
                act.estado_actividad.descripcion = 'Finalizada';
                
                this.cargarActividades();
              },
              error: (err) => {
                const msg = err.error?.detail || 'No se pudo finalizar la actividad.';
                this.mostrarToast(msg, 'danger');
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  prepararReprogramacion(act: any, modal: IonModal) {
    this.prepararEdicion(act, modal, true);
    this.mostrarToast('Ajuste la nueva fecha u horario para reprogramar la actividad.', 'warning');
  }

  // =====================================================================
  // ASISTENCIA E INSCRITOS EN TIEMPO REAL
  // =====================================================================

  verDetallesEstudiantes(act: any, modal: IonModal) {
    this.actividadSeleccionadaModal = act;
    this.listaEstudiantesInscritos = [];
    this.resumenInscritos = null;
    this.cargandoInscritos = true;
    modal.present();

    this.actividadService.getEstudiantesInscritos(act.id_actividad).subscribe({
      next: (res: ResumenListaInscritos | any) => {
        this.cargandoInscritos = false;
        
        const estudiantesRaw = res.estudiantes || [];
        
        this.listaEstudiantesInscritos = estudiantesRaw.map((est: any) => ({
          rut: est.rut || est.rut_usuario || 'S/R',
          rut_usuario: est.rut_usuario || est.rut || 'S/R',
          nombre: est.nombre || est.nombre_completo || 'Estudiante',
          nombre_completo: est.nombre_completo || est.nombre || 'Estudiante',
          asistio: Boolean(est.asistio)
        }));

        this.resumenInscritos = {
          id_actividad: act.id_actividad,
          nombre_actividad: act.nombre_actividad || 'Actividad',
          total_inscritos: res.total_inscritos ?? this.listaEstudiantesInscritos.length,
          total_asistentes: res.total_asistentes ?? this.listaEstudiantesInscritos.filter(e => e.asistio).length,
          estudiantes: [...this.listaEstudiantesInscritos]
        };
      },
      error: (err: any) => {
        this.cargandoInscritos = false;
        console.error('Error al obtener lista de inscritos:', err);
        this.mostrarToast('Error al cargar la lista de participantes', 'danger');
      }
    });
  }

  cambiarEstadoAsistencia(estudiante: any, estuvoPresente: boolean) {
    estudiante.asistio = estuvoPresente;
    
    if (this.resumenInscritos) {
      this.resumenInscritos = {
        ...this.resumenInscritos,
        total_asistentes: this.listaEstudiantesInscritos.filter(e => e.asistio).length,
        estudiantes: [...this.listaEstudiantesInscritos]
      };
    }
  }

  guardarAsistenciaLote() {
    if (!this.actividadSeleccionadaModal) return;

    if (!this.esEnCurso(this.actividadSeleccionadaModal)) {
      this.mostrarToast('La asistencia solo se puede registrar mientras la actividad esté En Curso.', 'warning');
      return;
    }

    const estudiantesProcesados: EstudianteAsistencia[] = this.listaEstudiantesInscritos
      .map(est => ({
        rut_usuario: String(est.rut || est.rut_usuario || '').trim(),
        presente: Boolean(est.asistio)
      }))
      .filter(est => est.rut_usuario !== '' && est.rut_usuario !== 'S/R');

    if (estudiantesProcesados.length === 0) {
      this.mostrarToast('No hay estudiantes con RUT válido para guardar.', 'warning');
      return;
    }

    this.cargandoAsistencia = true;

    this.actividadService.registrarAsistenciaMasiva(
      this.actividadSeleccionadaModal.id_actividad, 
      estudiantesProcesados
    ).subscribe({
      next: (res: any) => {
        this.cargandoAsistencia = false;
        const msg = res?.mensaje || 'Asistencia registrada correctamente.';
        this.mostrarToast(msg, 'success');
        
        if (this.modalDetalles) {
          this.modalDetalles.dismiss();
        }
        
        this.cargarActividades();
      },
      error: (err: any) => {
        this.cargandoAsistencia = false;
        console.error('Error guardando asistencia:', err);
        
        let msg = 'Error al registrar la asistencia';
        if (err.status === 422 && Array.isArray(err.error?.detail)) {
          const campoErr = err.error.detail[0]?.loc?.join(' -> ') || 'Formato';
          const msgErr = err.error.detail[0]?.msg || 'Inválido';
          msg = `Error de validación (422): ${campoErr} -> ${msgErr}`;
        } else if (err.error?.detail) {
          msg = err.error.detail;
        }
        
        this.mostrarToast(msg, 'danger');
      }
    });
  }

  seleccionarImagen(event: any, modo: 'agregar' | 'editar') {
    const file: File = event.target.files[0];
    if (!file) return;

    this.cargandoImagen = true;
    this.mostrarToast('Subiendo imagen...', 'warning');

    this.actividadService.subirImagen(file).subscribe({
      next: (res: { url: string; filename: string }) => {
        this.cargandoImagen = false;
        if (modo === 'agregar') {
          this.formulario.img_actv = res.url;
        } else {
          this.formularioEdicion.img_actv = res.url;
        }
        this.mostrarToast('Imagen subida correctamente', 'success');
      },
      error: (err: any) => {
        this.cargandoImagen = false;
        console.error('Error al subir imagen:', err);
        this.mostrarToast('Error al subir la imagen', 'danger');
      }
    });
  }

  quitarImagen(modo: 'agregar' | 'editar') {
    if (modo === 'agregar') {
      this.formulario.img_actv = '';
    } else {
      this.formularioEdicion.img_actv = '';
    }
    this.mostrarToast('Imagen eliminada del formulario', 'warning');
  }

  abrirModalDocentes(modo: 'agregar' | 'editar') {
    this.modoFormulario = modo;
    this.busquedaDocente = '';
    this.docentesFiltrados = [...this.listaDocentes];
    this.modalDocentes.present();
  }

  filtrarDocentes() {
    const q = this.busquedaDocente.toLowerCase().trim();
    if (!q) {
      this.docentesFiltrados = [...this.listaDocentes];
      return;
    }
    this.docentesFiltrados = this.listaDocentes.filter(doc =>
      (doc.nombre_completo && doc.nombre_completo.toLowerCase().includes(q)) ||
      (doc.rut_usuario && doc.rut_usuario.toLowerCase().includes(q))
    );
  }

  seleccionarDocente(docente: { rut_usuario: string; nombre_completo: string }) {
    const nombre = docente.nombre_completo || 'Docente Seleccionado';
    const rut = docente.rut_usuario || '';

    if (this.modoFormulario === 'agregar') {
      this.formulario.responsable_actividad = nombre;
      this.formulario.rut_usuario = rut;
    } else {
      this.formularioEdicion.responsable_actividad = nombre;
      this.formularioEdicion.rut_usuario = rut;
    }
    this.modalDocentes.dismiss();
  }

  limpiarFormulario() {
    const rutSesion = this.usuarioLogueado?.rut_usuario || localStorage.getItem('rut_usuario') || '';

    this.formulario = {
      nombre_actividad: '',
      descripcion: '',
      responsable_actividad: '',
      rut_usuario: rutSesion,
      id_tipo_actividad: null,
      id_estado_actividad: 1,
      id_sede: null,
      fecha: '',
      hora_inicio: '',
      hora_termino: '',
      puntos: null,
      cupos: null,
      lugar: '',
      requisito: '',
      img_actv: ''
    };

    if (this.esConsejero && this.usuarioLogueado) {
      this.formulario.responsable_actividad = 
        this.usuarioLogueado.nombre_completo || 
        `${this.usuarioLogueado.p_nombre || ''} ${this.usuarioLogueado.p_apellido || ''}`.trim() ||
        'Responsable';
    }
  }

  private formatearFecha(fechaStr: string): string {
    if (!fechaStr) return '';
    return fechaStr.split('T')[0];
  }

  private formatearHora(horaStr: string): string {
    if (!horaStr) return '00:00:00';
    const horaLimpia = horaStr.includes('T') ? horaStr.split('T')[1] : horaStr;
    const partes = horaLimpia.split(':');
    if (partes.length >= 2) {
      return `${partes[0].padStart(2, '0')}:${partes[1].padStart(2, '0')}:00`;
    }
    return '00:00:00';
  }

  private construirPayload(f: FormularioActividad): ActividadPayload {
    return {
      nombre_actividad: f.nombre_actividad,
      descripcion: f.descripcion || 'Sin descripción',
      responsable_actividad: f.responsable_actividad || 'Por asignar',
      rut_usuario: f.rut_usuario,
      id_tipo_actividad: Number(f.id_tipo_actividad),
      id_estado_actividad: f.id_estado_actividad ? Number(f.id_estado_actividad) : 1,
      id_sede: f.id_sede ? Number(f.id_sede) : 1,
      fecha: this.formatearFecha(f.fecha),
      hora_inicio: this.formatearHora(f.hora_inicio),
      hora_termino: this.formatearHora(f.hora_termino),
      puntos: f.puntos ? Number(f.puntos) : 0,
      cupos: f.cupos ? Number(f.cupos) : 0,
      lugar: f.lugar || 'Por definir',
      requisito: f.requisito || 'Sin requisitos',
      img_actv: f.img_actv || ''
    };
  }

  guardarActividad(modal: IonModal) {
    if (this.cargandoGuardado) return;

    if (!this.formulario.nombre_actividad || !this.formulario.rut_usuario || !this.formulario.id_tipo_actividad) {
      this.mostrarToast('Por favor complete los campos obligatorios (*)', 'warning');
      return;
    }

    this.cargandoGuardado = true;
    const payload = this.construirPayload(this.formulario);

    this.actividadService.crearActividad(payload).subscribe({
      next: () => {
        this.cargandoGuardado = false;
        this.mostrarToast('Actividad creada exitosamente', 'success');
        this.cargarActividades();
        modal.dismiss();
        this.limpiarFormulario();
      },
      error: (err: any) => {
        this.cargandoGuardado = false;
        console.error('Error al crear:', err);
        this.mostrarToast('Error al crear la actividad', 'danger');
      }
    });
  }

  async prepararEdicion(act: any, modal: IonModal, esReprogramacion: boolean = false) {
    // 1. Si no es reprogramación y la actividad ya no está programada
    if (!esReprogramacion && !this.esProgramada(act)) {
      this.mostrarToast('Las actividades en curso o finalizadas no se pueden editar.', 'warning');
      return;
    }

    // 2. RESTRICCIÓN DE EDICIÓN CON INSCRITOS:
    // Si la actividad ya tiene inscritos y NO es una reprogramación, se bloquea la edición general
    if (!esReprogramacion && this.tieneInscritos(act)) {
      const alertBloqueo = await this.alertController.create({
        header: 'Edición Denegada',
        message: 'No puedes editar los datos de una actividad que ya cuenta con alumnos inscritos. Solo se permite Iniciar la actividad o gestionar su asistencia.',
        buttons: ['Entendido']
      });
      await alertBloqueo.present();
      return;
    }

    this.modoReprogramacionModal = esReprogramacion;
    this.idActividadSeleccionada = act.id_actividad;

    const puntoItem = Array.isArray(act.puntaje_act) ? act.puntaje_act[0] : act.puntaje_act;
    const cupoItem = Array.isArray(act.cupo_actividad) ? act.cupo_actividad[0] : act.cupo_actividad;
    const lugarItem = Array.isArray(act.lugar_actividad) ? act.lugar_actividad[0] : act.lugar_actividad;
    const calItem = Array.isArray(act.calendario) ? act.calendario[0] : act.calendario;
    const reqItem = Array.isArray(act.requisito_participacion) ? act.requisito_participacion[0] : act.requisito_participacion;

    this.formularioEdicion = {
      nombre_actividad: act.nombre_actividad || '',
      descripcion: act.descripcion || '',
      responsable_actividad: act.responsable_actividad || act.usuario?.nombre_completo || '',
      rut_usuario: act.rut_usuario || act.usuario?.rut_usuario || '',
      id_tipo_actividad: act.id_tipo_actividad ? Number(act.id_tipo_actividad) : null,
      id_estado_actividad: esReprogramacion ? 1 : (act.id_estado_actividad ? Number(act.id_estado_actividad) : 1),
      id_sede: act.id_sede ? Number(act.id_sede) : null,
      fecha: act.fecha ? act.fecha.split('T')[0] : '',
      hora_inicio: act.hora_inicio ? act.hora_inicio.slice(0, 5) : '',
      hora_termino: act.hora_termino ? act.hora_termino.slice(0, 5) : '',
      puntos: puntoItem?.cantidad ?? null,
      cupos: cupoItem?.cantidad ?? null,
      lugar: lugarItem?.descripcion || calItem?.lugar || '',
      requisito: reqItem?.descripcion || '',
      img_actv: act.img_actv || ''
    };

    modal.present();
  }

actualizarActividad(modal: IonModal) {
  if (!this.idActividadSeleccionada || this.cargandoGuardado) return;

  this.cargandoGuardado = true;

  // 1. Construimos el payload completo con todos los datos del formulario (cupos, puntos, lugar, etc.)
  const payload = this.construirPayload(this.formularioEdicion);

  if (this.modoReprogramacionModal) {
    // Forzamos el estado a 1 (Programada) para que vuelva a estar vigente en el sistema
    payload.id_estado_actividad = 1;

    // Intentamos primero con reprogramarActividad pasando el payload completo
    this.actividadService.reprogramarActividad(this.idActividadSeleccionada, payload).subscribe({
      next: () => {
        this.cargandoGuardado = false;
        this.mostrarToast('Actividad reprogramada exitosamente', 'success');
        this.cargarActividades();
        modal.dismiss();
      },
      error: (err: any) => {
        // Fallback: Si el endpoint /reprogramar espera solo horas o no existe, usamos actualizarActividad general
        this.actividadService.actualizarActividad(this.idActividadSeleccionada!, payload).subscribe({
          next: () => {
            this.cargandoGuardado = false;
            this.mostrarToast('Actividad reprogramada exitosamente', 'success');
            this.cargarActividades();
            modal.dismiss();
          },
          error: (errGen: any) => {
            this.cargandoGuardado = false;
            console.error('Error al reprogramar:', errGen);
            const msg = errGen.error?.detail || err.error?.detail || 'Error al reprogramar la actividad.';
            this.mostrarToast(msg, 'danger');
          }
        });
      }
    });

  } else {
    // Edición estándar de una actividad programada
    this.actividadService.actualizarActividad(this.idActividadSeleccionada, payload).subscribe({
      next: () => {
        this.cargandoGuardado = false;
        this.mostrarToast('Actividad actualizada correctamente', 'success');
        this.cargarActividades();
        modal.dismiss();
      },
      error: (err: any) => {
        this.cargandoGuardado = false;
        console.error('Error al actualizar:', err);
        const msg = err.error?.detail || 'Error al actualizar la actividad';
        this.mostrarToast(msg, 'danger');
      }
    });
  }
}

  async confirmarEliminacion(act: any) {
    const actividadObj = typeof act === 'object' ? act : this.listaActividades.find(a => a.id_actividad === act);

    // Validación de seguridad para impedir borrar actividades con inscritos
    if (this.tieneInscritos(actividadObj)) {
      const alertBloqueo = await this.alertController.create({
        header: 'Acción Denegada',
        message: 'No puedes eliminar esta actividad porque ya cuenta con alumnos inscritos.',
        buttons: ['Entendido']
      });
      await alertBloqueo.present();
      return;
    }

    const id = actividadObj ? actividadObj.id_actividad : act;

    const alert = await this.alertController.create({
      header: 'Confirmar Eliminación',
      message: '¿Está seguro de que desea eliminar esta actividad?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.eliminarActividad(id)
        }
      ]
    });
    await alert.present();
  }

  eliminarActividad(id: number) {
    const act = this.listaActividades.find(a => a.id_actividad === id);
    if (this.tieneInscritos(act)) {
      this.mostrarToast('No es posible eliminar una actividad que ya posee inscripciones.', 'warning');
      return;
    }

    this.actividadService.eliminarActividad(id).subscribe({
      next: () => {
        this.mostrarToast('Actividad eliminada correctamente', 'success');
        this.cargarActividades();
      },
      error: () => this.mostrarToast('Error al eliminar la actividad', 'danger')
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
}