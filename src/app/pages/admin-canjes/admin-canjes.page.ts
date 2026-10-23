import { Component, OnInit, OnDestroy } from '@angular/core';
import { AlertController, ToastController, LoadingController, ViewWillEnter, ViewWillLeave } from '@ionic/angular';
import { ActividadService, SolicitudCanje } from 'src/app/services/actividad';

@Component({
  selector: 'app-admin-canjes',
  templateUrl: './admin-canjes.page.html',
  styleUrls: ['./admin-canjes.page.scss'],
  standalone: false
})
export class AdminCanjesPage implements OnInit, OnDestroy, ViewWillEnter, ViewWillLeave {
  solicitudes: SolicitudCanje[] = [];
  solicitudesFiltradas: SolicitudCanje[] = [];
  
  filtroEstado: string = 'todos';
  busqueda: string = '';
  cargando: boolean = false;

  // Datos del usuario autenticado
  rutUsuarioLogueado: string = '';
  idTipoUsuarioLogueado: number = 2; // Por defecto Admin
  idSedeUsuarioLogueado: number | null = null;

  private autoRefreshInterval: any = null;

  constructor(
    private actividadService: ActividadService,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    this.obtenerSesionUsuario();
  }

  /**
   * Helper para limpiar y formatear RUTs para comparaciones exactas
   */
  public limpiarRut(rut: string): string {
    return String(rut || '').replace(/[^0-9kK]/g, '').trim().toUpperCase();
  }

  /**
   * Determina si la solicitud pertenece al mismo usuario que está navegando
   */
  public esSuPropiaSolicitud(item: SolicitudCanje): boolean {
    const rutSolicitante = this.limpiarRut(item.rut_usuario || item.usuario?.rut_usuario || '');
    const rutLogueado = this.limpiarRut(this.rutUsuarioLogueado);
    
    return Boolean(rutSolicitante && rutLogueado && rutSolicitante === rutLogueado);
  }

  /**
   * Obtiene la información del usuario autenticado desde el almacenamiento local
   */
  private obtenerSesionUsuario() {
    const sessionData = localStorage.getItem('usuarioLogueado') || 
                        localStorage.getItem('usuario') ||
                        sessionStorage.getItem('usuarioLogueado') ||
                        sessionStorage.getItem('rut_usuario');

    if (sessionData) {
      try {
        const userObj = typeof sessionData === 'string' && sessionData.trim().startsWith('{')
          ? JSON.parse(sessionData)
          : sessionData;

        const rawRut = userObj?.rut_usuario || userObj?.rut || (typeof sessionData === 'string' ? sessionData : '');
        this.rutUsuarioLogueado = this.limpiarRut(rawRut);
        this.idTipoUsuarioLogueado = userObj?.id_tipo_usuario ? Number(userObj.id_tipo_usuario) : 2;
        this.idSedeUsuarioLogueado = userObj?.id_sede ? Number(userObj.id_sede) : null;
      } catch (e) {
        console.error('Error procesando sesión del usuario:', e);
      }
    }
  }

  ionViewWillEnter() {
    this.obtenerSesionUsuario();
    this.cargarSolicitudes();
    this.iniciarAutoRefresh();
  }

  ionViewWillLeave() {
    this.detenerAutoRefresh();
  }

  ngOnDestroy() {
    this.detenerAutoRefresh();
  }

  private iniciarAutoRefresh() {
    this.detenerAutoRefresh();
    this.autoRefreshInterval = setInterval(() => {
      this.cargarSolicitudes(null, true);
    }, 15000);
  }

  private detenerAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  }

cargarSolicitudes(event?: any, esSilencioso: boolean = false) {
  if (!esSilencioso && !event && this.solicitudes.length === 0) {
    this.cargando = true;
  }

  // Todos los roles de gestión (Admin, Docente y Consejero) consultan las solicitudes.
  // La regla de auto-aprobación la gestiona esSuPropiaSolicitud(item) deshabilitando botones.
  const peticion$ = this.actividadService.obtenerCanjes();

  peticion$.subscribe({
    next: (data: any[]) => {
      // Mapear la información obtenida para la vista (SIN EXCLUIR NINGUNA SOLICITUD)
      this.solicitudes = (data || []).map(item => {
        const usr = Array.isArray(item.usuario) ? item.usuario[0] : item.usuario;
        const idSedeUsuario = usr?.id_sede ? Number(usr.id_sede) : null;

        let nombreSedeUsuario = '';
        if (usr?.sede) {
          const sObj = Array.isArray(usr.sede) ? usr.sede[0] : usr.sede;
          nombreSedeUsuario = sObj?.descripcion || '';
        }

        const infoNivelAlumno = item.info_nivel_usuario || {
          id_nivel: 1,
          nombre_nivel: 'Bronce',
          total_actividades: 0,
          faltantes_siguiente: 4
        };

        const premioObj = Array.isArray(item.premio) ? item.premio[0] : item.premio;
        
        const nivelObj = Array.isArray(premioObj?.nivel) ? premioObj.nivel[0] : premioObj?.nivel;
        const idNivelPremio = premioObj?.id_nivel ? Number(premioObj.id_nivel) : (nivelObj?.id_nivel ? Number(nivelObj.id_nivel) : 1);
        const nombreNivelPremio = nivelObj?.nombre_nivel || (idNivelPremio === 3 ? 'Platino' : (idNivelPremio === 2 ? 'Oro' : 'Bronce'));

        const catObj = Array.isArray(premioObj?.categoria_premio) ? premioObj.categoria_premio[0] : premioObj?.categoria_premio;

        let stocks: any[] = premioObj?.stock_sede || [];
        if (stocks && !Array.isArray(stocks)) {
          stocks = [stocks];
        }

        let stockEncontrado = 0;

        if (Array.isArray(stocks) && stocks.length > 0) {
          let registro = stocks.find((s: any) => Number(s.id_sede) === idSedeUsuario);

          if (!registro && premioObj?.id_sede && Number(premioObj.id_sede) === idSedeUsuario) {
            registro = stocks.find((s: any) => Number(s.id_sede) === Number(premioObj.id_sede));
          }

          if (!registro && stocks.length === 1) {
            registro = stocks[0];
          }

          if (registro) {
            stockEncontrado = Number(registro.cantidad);
          }
        }

        return {
          ...item,
          usuario: usr,
          info_nivel_usuario: infoNivelAlumno,
          premio: {
            ...premioObj,
            id_nivel: idNivelPremio,
            nombre_nivel: nombreNivelPremio,
            nivel: nivelObj || { id_nivel: idNivelPremio, nombre_nivel: nombreNivelPremio, min_actividades: 0 },
            categoria_premio: catObj
          },
          nombre_sede_alumno: nombreSedeUsuario || 'Puente Alto',
          stock_sede_alumno: stockEncontrado
        };
      });

      this.aplicarFiltros();
      this.cargando = false;
      if (event) event.target.complete();
    },
    error: (err) => {
      console.error('[ERROR CARGAR CANJES]:', err);
      if (!esSilencioso) {
        const msg = err.error?.detail || 'Error al cargar las solicitudes de canje';
        this.mostrarToast(msg, 'danger');
      }
      this.cargando = false;
      if (event) event.target.complete();
    }
  });
}


  aplicarFiltros() {
    this.solicitudesFiltradas = this.solicitudes.filter(item => {
      const cumpleEstado = this.filtroEstado === 'todos' || item.id_estado_canje === Number(this.filtroEstado);
      const termino = this.busqueda.toLowerCase().trim();
      
      const nombreAlumno = item.usuario?.nombre_completo ? item.usuario.nombre_completo.toLowerCase() : '';
      const descripcionPremio = item.premio?.descripcion ? item.premio.descripcion.toLowerCase() : '';
      const nombreNivel = item.premio?.nombre_nivel ? item.premio.nombre_nivel.toLowerCase() : '';
      const rut = item.rut_usuario ? item.rut_usuario.toLowerCase() : '';

      return cumpleEstado && (
        termino === '' || 
        rut.includes(termino) || 
        nombreAlumno.includes(termino) || 
        descripcionPremio.includes(termino) ||
        nombreNivel.includes(termino)
      );
    });
  }

  async aprobarCanje(item: SolicitudCanje) {
    if (this.esSuPropiaSolicitud(item)) {
      this.mostrarToast('No puedes aprobar tus propias solicitudes de canje. Requiere validación de un Administrador.', 'warning');
      return;
    }

    const nivelPremio = item.premio?.nombre_nivel || 'Bronce';
    const alert = await this.alertController.create({
      header: 'Aprobar Solicitud',
      message: `¿Confirmas la aprobación para "${item.premio?.descripcion || 'el premio'}" (Nivel ${nivelPremio})? En este momento se re-validará el nivel del alumno, se descontarán ${item.costo_puntaje} pts y 1 unidad del stock de la sede.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Sí, Aprobar',
          handler: () => {
            this.ejecutarAccion(
              this.actividadService.aprobarCanje(item.id_canje),
              item,
              2
            );
          }
        }
      ]
    });
    await alert.present();
  }

  async marcarComoRetirado(item: SolicitudCanje) {
    const alert = await this.alertController.create({
      header: 'Confirmar Entrega Presencial',
      message: `¿El estudiante ${item.usuario?.nombre_completo || item.rut_usuario} ha retirado su premio "${item.premio?.descripcion || ''}" en DAE presencialmente? Se enviará un correo de confirmación de entrega al estudiante.`,
      buttons: [
        { text: 'Volver', role: 'cancel' },
        {
          text: 'Confirmar Entrega',
          handler: () => {
            this.ejecutarAccion(
              this.actividadService.marcarComoRetirado(item.id_canje),
              item,
              3
            );
          }
        }
      ]
    });
    await alert.present();
  }

  async cancelarPorStock(item: SolicitudCanje) {
    const esSolicitudPendiente = item.id_estado_canje === 1;
    
    const mensaje = esSolicitudPendiente
      ? `¿Rechazar esta solicitud? Como aún no se han descontado puntos, la solicitud cambiará a estado Rechazado y se notificará por correo al estudiante.`
      : `¿Cancelar este canje aprobado? Se devolverán ${item.costo_puntaje} pts al estudiante, se reincorporará la unidad al stock de la sede y se enviará la notificación por correo.`;

    const alert = await this.alertController.create({
      header: esSolicitudPendiente ? 'Rechazar Solicitud' : 'Cancelar Canje Aprobado',
      message: mensaje,
      buttons: [
        { text: 'Volver', role: 'cancel' },
        {
          text: esSolicitudPendiente ? 'Rechazar Solicitud' : 'Cancelar y Reembolsar',
          role: 'destructive',
          handler: () => {
            this.ejecutarAccion(
              this.actividadService.cancelarPorStock(item.id_canje),
              item,
              4
            );
          }
        }
      ]
    });
    await alert.present();
  }

  private async ejecutarAccion(peticion$: any, itemAfectado: SolicitudCanje, nuevoEstadoId: number) {
    const loader = await this.loadingController.create({ message: 'Procesando...' });
    await loader.present();

    peticion$.subscribe({
      next: (res: any) => {
        loader.dismiss();
        
        itemAfectado.id_estado_canje = nuevoEstadoId;

        if (nuevoEstadoId === 2 && itemAfectado.stock_sede_alumno !== undefined && itemAfectado.stock_sede_alumno > 0) {
          itemAfectado.stock_sede_alumno -= 1;
        }

        if (nuevoEstadoId === 4 && itemAfectado.stock_sede_alumno !== undefined) {
          itemAfectado.stock_sede_alumno += 1;
        }

        this.aplicarFiltros();
        
        this.mostrarToast(res.message || 'Operación realizada con éxito', 'success');

        this.cargarSolicitudes(null, true);
      },
      error: (err: any) => {
        loader.dismiss();
        const errorMsg = err.error?.detail || 'Ocurrió un error al procesar la solicitud';
        this.mostrarToast(errorMsg, 'danger');
      }
    });
  }

  private async mostrarToast(mensaje: string, color: string = 'dark') {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3500,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }
}