import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { ActividadService, SolicitudCanjePayload } from 'src/app/services/actividad';

@Component({
  selector: 'app-canjear',
  templateUrl: './canjear.page.html',
  styleUrls: ['./canjear.page.scss'],
  standalone: false
})
export class CanjearPage implements OnInit {

  misPuntos: number = 0;
  premios: any[] = [];
  solicitudesPendientesIds: number[] = [];
  
  // Lista para almacenar los IDs de premios que el usuario ya solicitó, aprobó o retiró
  premiosCanjeadosIds: number[] = [];
  
  cargando: boolean = true;
  usuarioLogueado: any = null;

  constructor(
    private actividadService: ActividadService,
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router,
    private cdRef: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.cargarDatos();
  }

  ionViewWillEnter() {
    this.cargarDatos();
  }

  private limpiarRut(rut: any): string {
    if (!rut) return '';
    return String(rut).replace(/[^0-9kK]/g, '').trim();
  }

  cargarDatos() {
    this.cargando = true;

    const possibleKeys = ['usuario', 'user', 'currentUser', 'usuarioLogueado', 'token', 'session'];
    let sessionData: any = null;

    for (const key of possibleKeys) {
      const val = localStorage.getItem(key) || sessionStorage.getItem(key);
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

    let identificador = sessionData;

    try {
      if (typeof sessionData === 'string' && sessionData.trim().startsWith('{')) {
        this.usuarioLogueado = JSON.parse(sessionData);
        identificador = this.usuarioLogueado.token || 
                        this.usuarioLogueado.token_acceso || 
                        this.usuarioLogueado.rut_usuario || 
                        this.usuarioLogueado.rut || 
                        sessionData;
      } else {
        this.usuarioLogueado = { rut_usuario: sessionData };
      }
    } catch (e) {
      this.usuarioLogueado = { rut_usuario: sessionData };
    }

    const rutRaw = this.usuarioLogueado?.rut_usuario || this.usuarioLogueado?.rut || identificador;

    console.log('[CANJEAR] RUT detectado en sesión:', rutRaw);

    // 1. Cargar primero las solicitudes para marcar los premios pendientes o ya canjeados
    this.obtenerSolicitudesPrevias(rutRaw, () => {
      // 2. Cargar catálogo de premios
      this.obtenerCatalogoPremios();
    });

    const servicioAny: any = this.actividadService;
    if (typeof servicioAny.getUsuarioSesion === 'function') {
      servicioAny.getUsuarioSesion(identificador).subscribe({
        next: (userBD: any) => {
          if (userBD) {
            this.usuarioLogueado = { ...this.usuarioLogueado, ...userBD };
            this.misPuntos = userBD.puntaje_total ?? userBD.puntaje ?? userBD.puntos ?? 0;
          }
          this.cdRef.detectChanges();
        },
        error: () => {
          this.obtenerPuntosUsuario(rutRaw);
        }
      });
    } else {
      this.obtenerPuntosUsuario(rutRaw);
    }
  }

  /**
   * Rescata las solicitudes del alumno directamente del Backend.
   */
  private obtenerSolicitudesPrevias(rutRaw: string, callback: () => void) {
    const servicioAny: any = this.actividadService;

    if (!rutRaw || typeof servicioAny.getSolicitudesCanjeUsuario !== 'function') {
      console.warn('[CANJEAR] No existe la función getSolicitudesCanjeUsuario en ActividadService');
      this.solicitudesPendientesIds = [];
      this.premiosCanjeadosIds = [];
      callback();
      return;
    }

    const rutOriginal = String(rutRaw).trim();
    const rutLimpio = this.limpiarRut(rutRaw);

    console.log('[CANJEAR] Consultando solicitudes para RUT:', rutOriginal);

    servicioAny.getSolicitudesCanjeUsuario(rutOriginal).subscribe({
      next: (res: any) => {
        let lista = Array.isArray(res) ? res : (res?.data || res?.solicitudes || res?.result || []);
        
        if (lista.length === 0 && rutLimpio && rutLimpio !== rutOriginal) {
          console.log('[CANJEAR] Reintentando con RUT sin formato:', rutLimpio);
          servicioAny.getSolicitudesCanjeUsuario(rutLimpio).subscribe({
            next: (res2: any) => {
              const lista2 = Array.isArray(res2) ? res2 : (res2?.data || res2?.solicitudes || res2?.result || []);
              this.procesarSolicitudesPendientes(lista2);
              callback();
            },
            error: (err2: any) => {
              console.error('[CANJEAR] Error reintento solicitudes:', err2);
              this.solicitudesPendientesIds = [];
              this.premiosCanjeadosIds = [];
              callback();
            }
          });
        } else {
          this.procesarSolicitudesPendientes(lista);
          callback();
        }
      },
      error: (err: any) => {
        console.error('[CANJEAR] Error al obtener solicitudes:', err);
        this.solicitudesPendientesIds = [];
        this.premiosCanjeadosIds = [];
        callback();
      }
    });
  }

  /**
   * Discrimina solicitudes pendientes (1 = Solicitado) y canjes consumidos (2 = Aprobado, 3 = Retirado).
   * Las solicitudes canceladas (4 = Cancelado) se ignoran intencionalmente para liberar el premio.
   */
  private procesarSolicitudesPendientes(lista: any[]) {
    this.solicitudesPendientesIds = [];
    this.premiosCanjeadosIds = [];

    if (!Array.isArray(lista)) return;

    lista.forEach((s: any) => {
      const idEstado = Number(s.id_estado_canje ?? s.id_estado ?? s.estado_id ?? s.estado_canje?.id_estado_canje ?? 0);
      const descEstado = String(s.descripcion ?? s.estado ?? s.descripcion_estado ?? s.estado_canje?.descripcion ?? '').toUpperCase();
      const idPremio = Number(s.id_premio ?? s.premio_id ?? s.premio?.id_premio ?? 0);

      console.log(`[CANJEAR DB] Evaluando registro -> Premio ID: ${idPremio}, Estado ID: ${idEstado}, Desc: "${descEstado}"`);

      // Estado 1 = 'Solicitado' (Pendiente de aprobación del Admin)
      const esPendiente = (idEstado === 1) || (descEstado.includes('SOLICITAD') && !descEstado.includes('APROBAD'));
      
      // Estados 1, 2, 3 = Bloquean el premio para evitar canjes repetidos por alumno
      const esBloqueado = (idEstado === 1 || idEstado === 2 || idEstado === 3);

      if (idPremio > 0) {
        if (esPendiente && !this.solicitudesPendientesIds.includes(idPremio)) {
          this.solicitudesPendientesIds.push(idPremio);
        }
        if (esBloqueado && !this.premiosCanjeadosIds.includes(idPremio)) {
          this.premiosCanjeadosIds.push(idPremio);
        }
      }
    });

    console.log('[CANJEAR DB] Array final de IDs en estado SOLICITADO:', this.solicitudesPendientesIds);
    console.log('[CANJEAR DB] Array final de IDs BLOQUEADOS (Máx 1):', this.premiosCanjeadosIds);
  }

  private obtenerPuntosUsuario(rut: string) {
    const servicioAny: any = this.actividadService;

    if (rut && typeof servicioAny.getPuntajeTotal === 'function') {
      servicioAny.getPuntajeTotal(rut).subscribe({
        next: (res: any) => {
          this.misPuntos = res?.puntaje_total ?? res?.puntaje ?? res?.puntos ?? (typeof res === 'number' ? res : 0);
          this.actualizarPuntosLocales(this.misPuntos);
        },
        error: () => {
          this.misPuntos = this.usuarioLogueado?.puntaje_total ?? this.usuarioLogueado?.puntaje ?? 0;
          this.cargando = false;
          this.cdRef.detectChanges();
        }
      });
    } else {
      this.misPuntos = this.usuarioLogueado?.puntaje_total ?? this.usuarioLogueado?.puntaje ?? 0;
      this.cargando = false;
      this.cdRef.detectChanges();
    }
  }

  private obtenerCatalogoPremios() {
    const servicioAny: any = this.actividadService;
    const peticion$ = typeof servicioAny.getPremios === 'function'
      ? servicioAny.getPremios()
      : this.actividadService.getActividades();

    peticion$.subscribe({
      next: (res: any) => {
        const lista: any[] = Array.isArray(res) ? res : (res?.data || []);
        const idSedeAlumno = Number(this.usuarioLogueado?.id_sede || 0);

        this.premios = lista
          .map((item: any) => {
            const idPremioNum = Number(item.id_premio);
            const esVisible = item.estado_visibilidad === true || item.estado_visibilidad === 1 || String(item.estado_visibilidad) === 'true';

            let stockCalculado = 0;
            if (Array.isArray(item.stock_sede) && item.stock_sede.length > 0) {
              const stockSedeUsuario = item.stock_sede.find((st: any) => Number(st.id_sede) === idSedeAlumno);
              stockCalculado = Number(stockSedeUsuario ? stockSedeUsuario.cantidad : (item.stock_sede[0]?.cantidad ?? 0));
            } else if (item.cantidad !== undefined && item.cantidad !== null) {
              stockCalculado = Number(item.cantidad);
            } else {
              stockCalculado = Number(item.stock ?? item.cantidad_disponible ?? 0);
            }

            const costo = Number(item.puntos_requeridos ?? item.costo_puntos ?? 0);

            // Verificación de estados por alumno
            const estaPendiente = this.solicitudesPendientesIds.some(id => Number(id) === idPremioNum);
            const yaFueCanjeado = this.premiosCanjeadosIds.some(id => Number(id) === idPremioNum);

            return {
              id_premio: idPremioNum,
              nombre: item.descripcion || item.nombre_premio || 'Premio',
              descripcion: item.descripcion || 'Sin descripción disponible.',
              costo_puntos: isNaN(costo) ? 0 : costo,
              stock: isNaN(stockCalculado) ? 0 : stockCalculado,
              imagen: item.imagen || 'assets/logo.png',
              estado_visibilidad: esVisible,
              solicitado: estaPendiente,
              ya_canjeado: yaFueCanjeado,
              procesando: false
            };
          })
          .filter(p => p.estado_visibilidad === true);

        this.cargando = false;
        this.cdRef.detectChanges();
      },
      error: () => {
        this.cargando = false;
        this.cdRef.detectChanges();
      }
    });
  }

  async confirmarCanje(premio: any) {
    if (premio.solicitado) {
      await this.mostrarToast('Ya tienes una solicitud pendiente para este premio.', 'warning');
      return;
    }

    if (premio.ya_canjeado) {
      await this.mostrarToast('Ya has canjeado este premio anteriormente. Límite de 1 por alumno.', 'warning');
      return;
    }

    if (this.misPuntos < premio.costo_puntos) {
      await this.mostrarToast('Puntos insuficientes para este premio.', 'warning');
      return;
    }

    if (premio.stock <= 0) {
      await this.mostrarToast('Este premio se encuentra agotado en tu sede.', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Solicitar Canje',
      message: `Enviarás una solicitud para canjear "${premio.nombre}" por ${premio.costo_puntos} puntos.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Enviar Solicitud',
          handler: () => this.ejecutarCanje(premio)
        }
      ]
    });

    await alert.present();
  }

  ejecutarCanje(premio: any) {
    premio.procesando = true;
    const rut = this.usuarioLogueado?.rut_usuario || this.usuarioLogueado?.rut;
    const servicioAny: any = this.actividadService;

    const payload: SolicitudCanjePayload = {
      rut_alumno: rut,
      id_premio: premio.id_premio,
      lugar_entrega: 'Sede Central'
    };

    if (typeof servicioAny.canjearPremio === 'function') {
      servicioAny.canjearPremio(payload).subscribe({
        next: async (res: any) => {
          premio.procesando = false;
          premio.solicitado = true;
          premio.ya_canjeado = true;

          const idNum = Number(premio.id_premio);
          if (!this.solicitudesPendientesIds.includes(idNum)) {
            this.solicitudesPendientesIds.push(idNum);
          }
          if (!this.premiosCanjeadosIds.includes(idNum)) {
            this.premiosCanjeadosIds.push(idNum);
          }

          // Restar saldo de puntos localmente
          const nuevoSaldo = Math.max(0, this.misPuntos - premio.costo_puntos);
          this.actualizarPuntosLocales(nuevoSaldo);

          const msg = res?.mensaje || '¡Solicitud enviada con éxito!';
          await this.mostrarToast(msg, 'success');
          this.cdRef.detectChanges();
        },
        error: async (err: any) => {
          premio.procesando = false;
          const mensajeError = err?.error?.detail || err?.error?.message || 'No se pudo procesar la solicitud.';
          await this.mostrarToast(mensajeError, 'danger');
          this.cdRef.detectChanges();
        }
      });
    } else {
      setTimeout(async () => {
        premio.procesando = false;
        premio.solicitado = true;
        premio.ya_canjeado = true;

        const idNum = Number(premio.id_premio);
        if (!this.solicitudesPendientesIds.includes(idNum)) {
          this.solicitudesPendientesIds.push(idNum);
        }
        if (!this.premiosCanjeadosIds.includes(idNum)) {
          this.premiosCanjeadosIds.push(idNum);
        }

        const nuevoSaldo = Math.max(0, this.misPuntos - premio.costo_puntos);
        this.actualizarPuntosLocales(nuevoSaldo);

        await this.mostrarToast('¡Solicitud de canje enviada con éxito!', 'success');
        this.cdRef.detectChanges();
      }, 1000);
    }
  }

  /**
   * Confirmación para cancelar solicitud enviada
   */
  async confirmarCancelacion(premio: any) {
    const alert = await this.alertController.create({
      header: 'Cancelar Solicitud',
      message: `¿Estás seguro de que deseas cancelar tu solicitud de "${premio.nombre}"? Se te reembolsarán ${premio.costo_puntos} puntos y volverás a tener disponible la opción de canjearlo.`,
      buttons: [
        { text: 'No, mantener', role: 'cancel' },
        {
          text: 'Sí, cancelar solicitud',
          role: 'destructive',
          handler: () => this.ejecutarCancelacion(premio)
        }
      ]
    });

    await alert.present();
  }

  /**
   * Procesa la cancelación en Backend/Frontend y reembolsa puntos
   */
  ejecutarCancelacion(premio: any) {
    premio.procesando = true;
    const rut = this.usuarioLogueado?.rut_usuario || this.usuarioLogueado?.rut;
    const servicioAny: any = this.actividadService;

    const payload = {
      rut_alumno: rut,
      id_premio: premio.id_premio
    };

    if (typeof servicioAny.cancelarSolicitudCanje === 'function') {
      servicioAny.cancelarSolicitudCanje(payload).subscribe({
        next: async (res: any) => {
          premio.procesando = false;
          this.liberarEstadoPremio(premio);

          const msg = res?.mensaje || 'Solicitud cancelada correctamente.';
          await this.mostrarToast(msg, 'success');
          this.cdRef.detectChanges();
        },
        error: async (err: any) => {
          premio.procesando = false;
          const mensajeError = err?.error?.detail || err?.error?.message || 'No se pudo cancelar la solicitud.';
          await this.mostrarToast(mensajeError, 'danger');
          this.cdRef.detectChanges();
        }
      });
    } else {
      // Simulación local
      setTimeout(async () => {
        premio.procesando = false;
        this.liberarEstadoPremio(premio);
        await this.mostrarToast('Solicitud cancelada con éxito.', 'success');
        this.cdRef.detectChanges();
      }, 1000);
    }
  }

  /**
   * Reactiva localmente el premio en pantalla e incrementa los puntos devueltos
   */
  private liberarEstadoPremio(premio: any) {
    const idNum = Number(premio.id_premio);

    premio.solicitado = false;
    premio.ya_canjeado = false;

    // Remover del arreglo de pendientes y canjeados
    this.solicitudesPendientesIds = this.solicitudesPendientesIds.filter(id => Number(id) !== idNum);
    this.premiosCanjeadosIds = this.premiosCanjeadosIds.filter(id => Number(id) !== idNum);

    // Devolver puntos localmente al saldo
    const nuevoSaldo = this.misPuntos + Number(premio.costo_puntos || 0);
    this.actualizarPuntosLocales(nuevoSaldo);
  }

  actualizarPuntosLocales(nuevoSaldo: number) {
    this.misPuntos = nuevoSaldo;
    if (this.usuarioLogueado) {
      this.usuarioLogueado.puntaje_total = this.misPuntos;
      const possibleKeys = ['usuario', 'user', 'currentUser', 'usuarioLogueado'];
      for (const key of possibleKeys) {
        if (localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(this.usuarioLogueado));
        if (sessionStorage.getItem(key)) sessionStorage.setItem(key, JSON.stringify(this.usuarioLogueado));
      }
    }
    this.cdRef.detectChanges();
  }

  async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3500,
      color: color,
      position: 'bottom'
    });
    await toast.present();
  }
}