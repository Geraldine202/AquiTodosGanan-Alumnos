import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { IonModal, ToastController, AlertController, ViewWillEnter, ViewWillLeave } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { 
  ActividadService, 
  ActividadPayload, 
  ResumenListaInscritos, 
  EstudianteAsistencia 
} from '../../services/actividad';
import { AlumnoService } from 'src/app/services/alumno';

/**
 * Validador de grupo: Comprueba fecha futura/actual, hora de inicio no transcurrida y término > inicio.
 */
export const fechaYHoraFuturaValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const fechaVal = control.get('fecha')?.value;
  const horaInicio = control.get('hora_inicio')?.value;
  const horaTermino = control.get('hora_termino')?.value;

  if (!fechaVal) return null;

  const ahora = new Date();

  const anioHoy = ahora.getFullYear();
  const mesHoy = String(ahora.getMonth() + 1).padStart(2, '0');
  const diaHoy = String(ahora.getDate()).padStart(2, '0');
  const hoyStr = `${anioHoy}-${mesHoy}-${diaHoy}`;

  let fechaIngresadaStr = '';
  if (typeof fechaVal === 'string') {
    fechaIngresadaStr = fechaVal.split('T')[0];
  } else if (fechaVal instanceof Date) {
    const a = fechaVal.getFullYear();
    const m = String(fechaVal.getMonth() + 1).padStart(2, '0');
    const d = String(fechaVal.getDate()).padStart(2, '0');
    fechaIngresadaStr = `${a}-${m}-${d}`;
  }

  // 1. Fecha anterior a hoy
  if (fechaIngresadaStr < hoyStr) {
    return { fechaPasada: true };
  }

  // 2. Si es HOY, validar que la hora de inicio sea posterior a la actual
  if (fechaIngresadaStr === hoyStr && horaInicio) {
    const [horas, minutos] = horaInicio.split(':').map(Number);
    const fechaHoraInicio = new Date();
    fechaHoraInicio.setHours(horas, minutos, 0, 0);

    if (fechaHoraInicio <= ahora) {
      return { horaInicioPasada: true };
    }
  }

  // 3. Validar que la hora de término sea posterior a la de inicio
  if (horaInicio && horaTermino) {
    const [hIni, mIni] = horaInicio.split(':').map(Number);
    const [hFin, mFin] = horaTermino.split(':').map(Number);

    const minInicioTotal = hIni * 60 + mIni;
    const minTerminoTotal = hFin * 60 + mFin;

    if (minTerminoTotal <= minInicioTotal) {
      return { horaTerminoInvalida: true };
    }
  }

  return null;
};

@Component({
  selector: 'app-admin-actividades',
  templateUrl: './admin-actividades.page.html',
  styleUrls: ['./admin-actividades.page.scss'],
  standalone: false
})
export class AdminActividadesPage implements OnInit, OnDestroy, ViewWillEnter, ViewWillLeave {
  @ViewChild('modalDocentes') modalDocentes!: IonModal;
  @ViewChild('modalDetalles') modalDetalles!: IonModal;
  @ViewChild('modalAgregar') modalAgregar!: IonModal;
  @ViewChild('modalEdicion') modalEdicion!: IonModal;

  private usuarioSub?: Subscription;

  formAgregar!: FormGroup;
  formEdicion!: FormGroup;

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

  fechaMinima: string = new Date().toISOString().split('T')[0];

  constructor(
    private fb: FormBuilder,
    private actividadService: ActividadService,
    private alumnoService: AlumnoService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    this.crearFormularios();
  }

  ngOnInit() {}

  ionViewWillEnter() {
    this.fechaMinima = new Date().toISOString().split('T')[0];
    this.escucharUsuario();
    this.cargarCatalogos();
    this.cargarActividades();
  }

  ionViewWillLeave() {
    this.desuscribir();
  }

  ngOnDestroy() {
    this.desuscribir();
  }

  private desuscribir() {
    if (this.usuarioSub) {
      this.usuarioSub.unsubscribe();
    }
  }

  private crearFormularios() {
    this.formAgregar = this.fb.group({
      nombre_actividad: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      responsable_actividad: ['', Validators.required],
      rut_usuario: ['', Validators.required],
      id_tipo_actividad: [null, Validators.required],
      id_estado_actividad: [1],
      id_sede: [null, Validators.required],
      fecha: ['', Validators.required],
      hora_inicio: ['', Validators.required],
      hora_termino: ['', Validators.required],
      puntos: [null, [Validators.required, Validators.min(1)]],
      cupos: [null, [Validators.required, Validators.min(1)]],
      lugar: ['', Validators.required],
      requisito: [''],
      img_actv: ['']
    }, { validators: fechaYHoraFuturaValidator });

    this.formEdicion = this.fb.group({
      nombre_actividad: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      responsable_actividad: ['', Validators.required],
      rut_usuario: ['', Validators.required],
      id_tipo_actividad: [null, Validators.required],
      id_estado_actividad: [1],
      id_sede: [null, Validators.required],
      fecha: ['', Validators.required],
      hora_inicio: ['', Validators.required],
      hora_termino: ['', Validators.required],
      puntos: [null, [Validators.required, Validators.min(1)]],
      cupos: [null, [Validators.required, Validators.min(1)]],
      lugar: ['', Validators.required],
      requisito: [''],
      img_actv: ['']
    }, { validators: fechaYHoraFuturaValidator });
  }

  get fA() { return this.formAgregar.controls; }
  get fE() { return this.formEdicion.controls; }

  escucharUsuario() {
    if (this.usuarioSub) {
      this.usuarioSub.unsubscribe();
    }

    this.usuarioSub = this.alumnoService.usuario$.subscribe(usuario => {
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

        this.limpiarFormulario();

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
    this.actividadService.getResponsablesActivos().subscribe({
      next: (data: any) => {
        const responsablesRaw = Array.isArray(data) ? data : (data?.data || []);

        const responsablesProcesados = responsablesRaw.map((u: any) => ({
          ...u,
          rut_usuario: u.rut_usuario || 'S/R',
          nombre_completo: u.nombre_completo || 'Responsable'
        }));

        const mapaUsuarios = new Map();
        responsablesProcesados.forEach((u: any) => mapaUsuarios.set(u.rut_usuario, u));

        this.listaDocentes = Array.from(mapaUsuarios.values());
        this.docentesFiltrados = [...this.listaDocentes];
      },
      error: (err: any) => {
        console.error('Error al cargar responsables activos:', err);
        this.mostrarToast('Error al cargar la lista de responsables activos', 'danger');
      }
    });
  }

  private esResponsableActivo(rut: string): boolean {
    if (!rut) return false;
    const rutNorm = this.normalizarRut(rut);
    return this.listaDocentes.some(u => this.normalizarRut(u.rut_usuario) === rutNorm);
  }

  cargarActividades() {
    this.actividadService.getActividades().subscribe({
      next: (data: any) => {
        const lista = Array.isArray(data) ? data : (data?.data || []);
        this.listaActividades = lista.sort((a: any, b: any) => {
          const idA = Number(a.id_actividad || a.id || 0);
          const idB = Number(b.id_actividad || b.id || 0);
          return idB - idA;
        });
        this.filtrarActividades();
      },
      error: () => this.mostrarToast('Error al cargar la lista de actividades', 'danger')
    });
  }

  tieneInscritos(act: any): boolean {
    if (!act) return false;
    if (act.total_inscritos !== undefined && act.total_inscritos !== null) {
      return Number(act.total_inscritos) > 0;
    }
    if (act.cant_inscritos !== undefined && act.cant_inscritos !== null) {
      return Number(act.cant_inscritos) > 0;
    }
    const inscritosRaw = act.inscripcion_act ?? act.inscripciones ?? act.inscripcion ?? act.inscritos ?? act.asistencia_act ?? [];
    if (Array.isArray(inscritosRaw)) return inscritosRaw.length > 0;
    if (typeof inscritosRaw === 'number') return inscritosRaw > 0;
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
    if (act.puede_reprogramar !== undefined) return Boolean(act.puede_reprogramar);
    if (this.tieneInscritos(act)) return false;
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
    const rutUsuarioStorage = localStorage.getItem('rut_usuario') || localStorage.getItem('rut') || sessionStorage.getItem('rut_usuario') || '';
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

  async iniciarActividadAdmin(act: any) {
    const alert = await this.alertController.create({
      header: 'Iniciar Actividad',
      message: `¿Deseas poner en curso "${act.nombre_actividad}"? Se habilitará el control de asistencia (los alumnos iniciarán en estado Ausente por defecto).`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Sí, Iniciar',
          handler: () => {
            this.actividadService.iniciarActividad(act.id_actividad).subscribe({
              next: () => {
                this.mostrarToast('Actividad puesta En Curso exitosamente', 'success');
                this.cargarActividades();
              },
              error: async (err) => {
                const msg = err.error?.detail || 'No se pudo iniciar la actividad.';
                await this.mostrarAlerta('Error al Iniciar', msg);
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
      message: `¿Deseas finalizar "${act.nombre_actividad}"? Se liquidarán los puntos e incrementará la participación activa de los alumnos asistentes.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Sí, Finalizar',
          handler: () => {
            this.actividadService.terminarActividad(act.id_actividad).subscribe({
              next: () => {
                this.mostrarToast('Actividad finalizada, puntos liquidados y participación actualizada.', 'success');
                this.cargarActividades();
              },
              error: async (err) => {
                const msg = err.error?.detail || 'No se pudo finalizar la actividad.';
                await this.mostrarAlerta('Error al Finalizar', msg);
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
          asistio: est.asistio !== undefined && est.asistio !== null ? Boolean(est.asistio) : false
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
        const msg = res?.mensaje || 'Asistencia y participación activa actualizadas correctamente.';
        this.mostrarToast(msg, 'success');
        if (this.modalDetalles) this.modalDetalles.dismiss();
        this.cargarActividades();
      },
      error: async (err: any) => {
        this.cargandoAsistencia = false;
        let msg = 'Error al registrar la asistencia';
        if (err.status === 422 && Array.isArray(err.error?.detail)) {
          const campoErr = err.error.detail[0]?.loc?.join(' -> ') || 'Formato';
          const msgErr = err.error.detail[0]?.msg || 'Inválido';
          msg = `Error de validación (422): ${campoErr} -> ${msgErr}`;
        } else if (err.error?.detail) {
          msg = err.error.detail;
        }
        await this.mostrarAlerta('Error de Asistencia', msg);
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
          this.formAgregar.patchValue({ img_actv: res.url });
        } else {
          this.formEdicion.patchValue({ img_actv: res.url });
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
      this.formAgregar.patchValue({ img_actv: '' });
    } else {
      this.formEdicion.patchValue({ img_actv: '' });
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
      this.formAgregar.patchValue({
        responsable_actividad: nombre,
        rut_usuario: rut
      });
    } else {
      this.formEdicion.patchValue({
        responsable_actividad: nombre,
        rut_usuario: rut
      });
    }
    this.modalDocentes.dismiss();
  }

  limpiarFormulario() {
    const rutSesion = this.usuarioLogueado?.rut_usuario || 
      this.usuarioLogueado?.rut || 
      localStorage.getItem('rut_usuario') || 
      sessionStorage.getItem('rut_usuario') || '';

    const nombreResponsable = this.usuarioLogueado?.nombre_completo || 
      `${this.usuarioLogueado?.p_nombre || ''} ${this.usuarioLogueado?.p_apellido || ''}`.trim() || 
      'Responsable';

    const idSedeUsuario = Number(
      this.usuarioLogueado?.id_sede ?? 
      this.usuarioLogueado?.sede?.id_sede ?? 
      localStorage.getItem('id_sede') ?? 
      1
    );

    this.formAgregar.reset({
      nombre_actividad: '',
      descripcion: '',
      responsable_actividad: nombreResponsable,
      rut_usuario: rutSesion,
      id_tipo_actividad: null,
      id_estado_actividad: 1,
      id_sede: idSedeUsuario,
      fecha: '',
      hora_inicio: '',
      hora_termino: '',
      puntos: null,
      cupos: null,
      lugar: '',
      requisito: '',
      img_actv: ''
    });

    if (!this.esAdmin) {
      this.formAgregar.get('responsable_actividad')?.disable();
      this.formAgregar.get('id_sede')?.disable();
    } else {
      this.formAgregar.get('responsable_actividad')?.enable();
      this.formAgregar.get('id_sede')?.enable();
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

  private construirPayload(fValues: any): ActividadPayload {
    const idSedeVal = Number(fValues.id_sede);
    const idTipoVal = Number(fValues.id_tipo_actividad);

    return {
      nombre_actividad: fValues.nombre_actividad,
      descripcion: fValues.descripcion || 'Sin descripción',
      responsable_actividad: fValues.responsable_actividad || 'Por asignar',
      rut_usuario: fValues.rut_usuario || this.usuarioLogueado?.rut_usuario || '',
      id_tipo_actividad: isNaN(idTipoVal) ? 1 : idTipoVal,
      id_estado_actividad: fValues.id_estado_actividad ? Number(fValues.id_estado_actividad) : 1,
      id_sede: isNaN(idSedeVal) || idSedeVal === 0 ? 1 : idSedeVal,
      fecha: this.formatearFecha(fValues.fecha),
      hora_inicio: this.formatearHora(fValues.hora_inicio),
      hora_termino: this.formatearHora(fValues.hora_termino),
      puntos: fValues.puntos ? Number(fValues.puntos) : 1,
      cupos: fValues.cupos ? Number(fValues.cupos) : 1,
      lugar: fValues.lugar || 'Por definir',
      requisito: fValues.requisito || 'Sin requisitos',
      img_actv: fValues.img_actv || ''
    };
  }

  async guardarActividad(modal: IonModal) {
    if (this.formAgregar.invalid) {
      this.formAgregar.markAllAsTouched();
      this.mostrarToast('Por favor, verifique la fecha, horas y campos obligatorios (*)', 'warning');
      return;
    }

    // Se extrae getRawValue() para incluir rut_usuario aunque esté disabled
    const formValues = this.formAgregar.getRawValue();

    // Si la lista de docentes aún no ha cargado, permite continuar; de lo contrario valida
    if (this.listaDocentes.length > 0 && !this.esResponsableActivo(formValues.rut_usuario)) {
      await this.mostrarAlerta(
        'Responsable Inactivo', 
        'El responsable seleccionado no posee una matrícula activa o se encuentra suspendido/retirado.'
      );
      return;
    }

    if (this.cargandoGuardado) return;

    this.cargandoGuardado = true;
    const payload = this.construirPayload(formValues);

    this.actividadService.crearActividad(payload).subscribe({
      next: () => {
        this.cargandoGuardado = false;
        this.mostrarToast('Actividad creada exitosamente', 'success');
        this.cargarActividades();
        modal.dismiss();
        this.limpiarFormulario();
      },
      error: async (err: any) => {
        this.cargandoGuardado = false;
        console.error('Error al crear actividad:', err);

        const mensajeBackend = typeof err.error?.detail === 'string'
          ? err.error.detail
          : (err.error?.message || err.error?.error || 'No fue posible registrar la actividad.');

        // Despliega exclusivamente la Alerta emergente en pantalla
        await this.mostrarAlerta('Conflicto o Error de Validación', mensajeBackend);
      }
    });
  }

  async prepararEdicion(act: any, modal: IonModal, esReprogramacion: boolean = false) {
    if (!esReprogramacion && !this.esProgramada(act)) {
      this.mostrarToast('Las actividades en curso o finalizadas no se pueden editar.', 'warning');
      return;
    }

    if (!esReprogramacion && this.tieneInscritos(act)) {
      await this.mostrarAlerta(
        'Edición Denegada',
        'No puedes editar los datos de una actividad que ya cuenta con alumnos inscritos.'
      );
      return;
    }

    this.modoReprogramacionModal = esReprogramacion;
    this.idActividadSeleccionada = act.id_actividad;

    const puntoItem = Array.isArray(act.puntaje_act) ? act.puntaje_act[0] : act.puntaje_act;
    const cupoItem = Array.isArray(act.cupo_actividad) ? act.cupo_actividad[0] : act.cupo_actividad;
    const lugarItem = Array.isArray(act.lugar_actividad) ? act.lugar_actividad[0] : act.lugar_actividad;
    const calItem = Array.isArray(act.calendario) ? act.calendario[0] : act.calendario;
    const reqItem = Array.isArray(act.requisito_participacion) ? act.requisito_participacion[0] : act.requisito_participacion;

    this.formEdicion.patchValue({
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
    });

    if (!this.esAdmin) {
      this.formEdicion.get('responsable_actividad')?.disable();
      this.formEdicion.get('id_sede')?.disable();
    } else {
      this.formEdicion.get('responsable_actividad')?.enable();
      this.formEdicion.get('id_sede')?.enable();
    }

    modal.present();
  }

  async actualizarActividad(modal: IonModal) {
    if (this.formEdicion.invalid) {
      this.formEdicion.markAllAsTouched();
      this.mostrarToast('Por favor, verifique la fecha, horas y campos obligatorios (*)', 'warning');
      return;
    }

    const formValues = this.formEdicion.getRawValue();

    if (this.listaDocentes.length > 0 && !this.esResponsableActivo(formValues.rut_usuario)) {
      await this.mostrarAlerta(
        'Responsable Inactivo', 
        'El responsable seleccionado no posee una matrícula activa o se encuentra suspendido/retirado.'
      );
      return;
    }

    if (!this.idActividadSeleccionada || this.cargandoGuardado) return;

    this.cargandoGuardado = true;
    const payload = this.construirPayload(formValues);

    if (this.modoReprogramacionModal) {
      payload.id_estado_actividad = 1;

      this.actividadService.reprogramarActividad(this.idActividadSeleccionada, payload).subscribe({
        next: () => {
          this.cargandoGuardado = false;
          this.mostrarToast('Actividad reprogramada exitosamente', 'success');
          this.cargarActividades();
          modal.dismiss();
        },
        error: (err: any) => {
          this.actividadService.actualizarActividad(this.idActividadSeleccionada!, payload).subscribe({
            next: () => {
              this.cargandoGuardado = false;
              this.mostrarToast('Actividad reprogramada exitosamente', 'success');
              this.cargarActividades();
              modal.dismiss();
            },
            error: async (errGen: any) => {
              this.cargandoGuardado = false;
              console.error('Error al reprogramar:', errGen);
              const msg = errGen.error?.detail || err.error?.detail || 'Error al reprogramar la actividad.';
              await this.mostrarAlerta('Conflicto o Error de Reprogramación', msg);
            }
          });
        }
      });

    } else {
      this.actividadService.actualizarActividad(this.idActividadSeleccionada, payload).subscribe({
        next: () => {
          this.cargandoGuardado = false;
          this.mostrarToast('Actividad actualizada correctamente', 'success');
          this.cargarActividades();
          modal.dismiss();
        },
        error: async (err: any) => {
          this.cargandoGuardado = false;
          console.error('Error al actualizar:', err);
          const msg = err.error?.detail || 'Error al actualizar la actividad';
          await this.mostrarAlerta('Conflicto o Error de Actualización', msg);
        }
      });
    }
  }

  async confirmarEliminacion(act: any) {
    const actividadObj = typeof act === 'object' ? act : this.listaActividades.find(a => a.id_actividad === act);

    if (this.tieneInscritos(actividadObj)) {
      await this.mostrarAlerta(
        'Acción Denegada',
        'No puedes eliminar esta actividad porque ya cuenta con alumnos inscritos.'
      );
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
      error: async (err: any) => {
        const msg = err.error?.detail || 'Error al eliminar la actividad';
        await this.mostrarAlerta('Error de Eliminación', msg);
      }
    });
  }

  async mostrarAlerta(titulo: string, mensaje: string) {
    const alert = await this.alertController.create({
      header: titulo,
      message: mensaje,
      buttons: ['Entendido']
    });
    await alert.present();
  }

  async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      color: color,
      position: 'bottom'
    });
    await toast.present();
  }
}