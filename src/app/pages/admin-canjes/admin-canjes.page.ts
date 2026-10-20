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
   * Obtiene la información del usuario autenticado desde el almacenamiento local
   */
  private obtenerSesionUsuario() {
    const sessionData = localStorage.getItem('usuarioLogueado') || 
                        localStorage.getItem('usuario') ||
                        sessionStorage.getItem('usuarioLogueado');

    if (sessionData) {
      try {
        const userObj = typeof sessionData === 'string' && sessionData.trim().startsWith('{')
          ? JSON.parse(sessionData)
          : sessionData;

        this.rutUsuarioLogueado = (userObj?.rut_usuario || userObj?.rut || '').toString().trim();
        this.idTipoUsuarioLogueado = userObj?.id_tipo_usuario ? Number(userObj.id_tipo_usuario) : 2;
        this.idSedeUsuarioLogueado = userObj?.id_sede ? Number(userObj.id_sede) : null;
      } catch (e) {
        console.error('Error procesando sesión del usuario:', e);
      }
    }
  }

  /**
   * Ciclo de vida Ionic: Se ejecuta automáticamente cada vez que se entra a la vista.
   */
  ionViewWillEnter() {
    this.obtenerSesionUsuario();
    this.cargarSolicitudes();
    this.iniciarAutoRefresh();
  }

  /**
   * Ciclo de vida Ionic: Detiene la recarga automática cuando el usuario cambia de pantalla.
   */
  ionViewWillLeave() {
    this.detenerAutoRefresh();
  }

  ngOnDestroy() {
    this.detenerAutoRefresh();
  }

  /**
   * Inicia la actualización automática silenciosa cada 15 segundos.
   */
  private iniciarAutoRefresh() {
    this.detenerAutoRefresh();
    this.autoRefreshInterval = setInterval(() => {
      this.cargarSolicitudes(null, true);
    }, 15000);
  }

  /**
   * Limpia el temporizador para no consumir recursos en segundo plano.
   */
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

    // Elección del endpoint según id_tipo_usuario:
    // id_tipo_usuario == 2 (Administrador) -> Obtiene TODAS las solicitudes
    // id_tipo_usuario == 3 (Docente) o 4 (Consejero) -> Obtiene SOLICITUDES del responsable
    const peticion$ = (this.idTipoUsuarioLogueado === 2 || !this.rutUsuarioLogueado)
      ? this.actividadService.obtenerCanjes()
      : this.actividadService.obtenerCanjesPorResponsable(this.rutUsuarioLogueado);

    peticion$.subscribe({
      next: (data: any[]) => {
        // Mapear la información obtenida para la vista
        this.solicitudes = (data || []).map(item => {
          // 1. Obtener la información del Usuario
          const usr = Array.isArray(item.usuario) ? item.usuario[0] : item.usuario;
          const idSedeUsuario = usr?.id_sede ? Number(usr.id_sede) : null;

          // Nombre de la sede del usuario
          let nombreSedeUsuario = '';
          if (usr?.sede) {
            const sObj = Array.isArray(usr.sede) ? usr.sede[0] : usr.sede;
            nombreSedeUsuario = sObj?.descripcion || '';
          }

          // 2. Obtener la información del Nivel del Estudiante
          const infoNivelAlumno = item.info_nivel_usuario || {
            id_nivel: 1,
            nombre_nivel: 'Bronce',
            total_actividades: 0,
            faltantes_siguiente: 4
          };

          // 3. Obtener la información del Premio, su Nivel, Categoría y Stock
          const premioObj = Array.isArray(item.premio) ? item.premio[0] : item.premio;
          
          const nivelObj = Array.isArray(premioObj?.nivel) ? premioObj.nivel[0] : premioObj?.nivel;
          const idNivelPremio = premioObj?.id_nivel ? Number(premioObj.id_nivel) : (nivelObj?.id_nivel ? Number(nivelObj.id_nivel) : 1);
          const nombreNivelPremio = nivelObj?.nombre_nivel || (idNivelPremio === 3 ? 'Platino' : (idNivelPremio === 2 ? 'Oro' : 'Bronce'));

          const catObj = Array.isArray(premioObj?.categoria_premio) ? premioObj.categoria_premio[0] : premioObj?.categoria_premio;

          // Procesamiento de Stock por Sede
          let stocks: any[] = premioObj?.stock_sede || [];
          if (stocks && !Array.isArray(stocks)) {
            stocks = [stocks];
          }

          // 4. Buscar el stock real correspondiente a la sede del alumno
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

  // Acciones: Aprobar Solicitud (1 -> 2)
  async aprobarCanje(item: SolicitudCanje) {
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
              2 // Estado Aprobado
            );
          }
        }
      ]
    });
    await alert.present();
  }

  // Acciones: Confirmar Entrega Presencial (2 -> 3)
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
              3 // Estado Retirado
            );
          }
        }
      ]
    });
    await alert.present();
  }

  // Acciones: Rechazar o Cancelar (1 u 2 -> 4)
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
              4 // Estado Cancelado / Rechazado
            );
          }
        }
      ]
    });
    await alert.present();
  }

  /**
   * Ejecuta la petición al servidor e impacta la lista LOCAL al instante
   * para evitar latencias de renderizado.
   */
  private async ejecutarAccion(peticion$: any, itemAfectado: SolicitudCanje, nuevoEstadoId: number) {
    const loader = await this.loadingController.create({ message: 'Procesando...' });
    await loader.present();

    peticion$.subscribe({
      next: (res: any) => {
        loader.dismiss();
        
        // 1. Actualización local instantánea
        itemAfectado.id_estado_canje = nuevoEstadoId;

        // Descontar stock localmente si pasa a aprobado
        if (nuevoEstadoId === 2 && itemAfectado.stock_sede_alumno !== undefined && itemAfectado.stock_sede_alumno > 0) {
          itemAfectado.stock_sede_alumno -= 1;
        }

        // Reincorporar stock localmente si se cancela una aprobada
        if (nuevoEstadoId === 4 && itemAfectado.stock_sede_alumno !== undefined) {
          itemAfectado.stock_sede_alumno += 1;
        }

        // 2. Refrescar filtros
        this.aplicarFiltros();
        
        this.mostrarToast(res.message || 'Operación realizada con éxito', 'success');

        // 3. Re-sincronizar de fondo sin bloquear al usuario
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