import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { ActividadService, SolicitudCanjePayload, InfoNivelUsuario } from 'src/app/services/actividad';
import { AlumnoService } from 'src/app/services/alumno';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-canjear',
  templateUrl: './canjear.page.html',
  styleUrls: ['./canjear.page.scss'],
  standalone: false
})
export class CanjearPage implements OnInit {

  misPuntos: number = 0;

  premios: any[] = [];
  rawCatalogo: any[] = []; // Guarda la lista devuelta por la API para re-evaluar rápido sin parpadeos
  solicitudesPendientesIds: number[] = [];
  premiosCanjeadosIds: number[] = [];
  
  nivelUsuario: InfoNivelUsuario = {
    id_nivel: 1,
    nombre_nivel: 'Bronce',
    total_actividades: 0,
    faltantes_siguiente: 4
  };

  cargando: boolean = true;
  usuarioLogueado: any = null;

  constructor(
    private actividadService: ActividadService,
    private alumnoService: AlumnoService,
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
    return String(rut).replace(/[^0-9kK]/g, '').trim().toUpperCase();
  }

  cargarDatos() {
    // 1. Lectura con estándar idéntico a PerfilPage (prioriza sessionStorage)
    const possibleKeys = ['usuarioLogueado', 'usuario', 'user', 'currentUser'];
    let sessionData: any = null;

    for (const key of possibleKeys) {
      const val = sessionStorage.getItem(key) || localStorage.getItem(key);
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

    this.usuarioLogueado = objetoLocal;

    const rutRaw = objetoLocal?.rut_usuario || objetoLocal?.rut || objetoLocal?.alumno?.rut_usuario || sessionData;
    const rutLimpio = this.limpiarRut(rutRaw);

    if (!rutLimpio) {
      this.cargando = false;
      return;
    }

    // Carga inicial optimista desde datos locales
    if (objetoLocal) {
      this.misPuntos = Number(
        objetoLocal.puntaje_total ?? 
        objetoLocal.puntaje ?? 
        objetoLocal.puntos ?? 
        0
      );

      if (objetoLocal.nivelUsuarioInfo) {
        this.nivelUsuario = objetoLocal.nivelUsuarioInfo;
      } else if (objetoLocal.nivelUsuario) {
        this.nivelUsuario = objetoLocal.nivelUsuario;
      }

      this.cdRef.detectChanges();
    }

    const servicioAny: any = this.actividadService;

    // 2. Consultas en paralelo a la base de datos
    const reqPuntos = typeof servicioAny.getPuntajeTotal === 'function'
      ? servicioAny.getPuntajeTotal(rutLimpio).pipe(catchError(() => of(null)))
      : of(null);

    const reqNivel = typeof servicioAny.getNivelUsuario === 'function'
      ? servicioAny.getNivelUsuario(rutLimpio).pipe(catchError(() => of(null)))
      : of(null);

    const reqSolicitudes = typeof servicioAny.getSolicitudesCanjeUsuario === 'function'
      ? servicioAny.getSolicitudesCanjeUsuario(rutLimpio).pipe(catchError(() => of([])))
      : of([]);

    const reqCatalogo = typeof servicioAny.getPremios === 'function'
      ? servicioAny.getPremios().pipe(catchError(() => of([])))
      : this.actividadService.getActividades().pipe(catchError(() => of([])));

    forkJoin({
      resPuntos: reqPuntos,
      resNivel: reqNivel,
      solicitudes: reqSolicitudes,
      catalogo: reqCatalogo
    }).subscribe({
      next: ({ resPuntos, resNivel, solicitudes, catalogo }: any) => {
        
        // Extracción exacta de puntos oficiales desde BD (mismo mapeo de PerfilPage)
        let puntosOficialesBD = this.misPuntos;
        if (typeof resPuntos === 'number') {
          puntosOficialesBD = resPuntos;
        } else if (resPuntos && typeof resPuntos === 'object') {
          puntosOficialesBD = Number(
            resPuntos.puntaje_total ?? 
            resPuntos.puntaje ?? 
            resPuntos.puntos ?? 
            resPuntos.total ?? 
            0
          );
        }

        this.misPuntos = puntosOficialesBD;

        if (this.usuarioLogueado) {
          this.usuarioLogueado.puntaje_total = puntosOficialesBD;
          this.usuarioLogueado.puntaje = puntosOficialesBD;
          this.usuarioLogueado.puntos = puntosOficialesBD;
          this.actualizarSesionLocal(this.usuarioLogueado);
        }

        // Nivel del usuario
        if (resNivel) {
          this.nivelUsuario = resNivel;
          if (this.usuarioLogueado) {
            this.usuarioLogueado.nivelUsuarioInfo = resNivel;
          }
        }

        // Procesamiento de solicitudes activas y catálogo
        const listaSolicitudes = Array.isArray(solicitudes) ? solicitudes : (solicitudes?.data || []);
        this.procesarSolicitudes(listaSolicitudes);

        this.rawCatalogo = Array.isArray(catalogo) ? catalogo : (catalogo?.data || []);
        this.procesarCatalogoPremios(this.rawCatalogo);

        this.cargando = false;
        this.cdRef.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al cargar datos en CanjearPage:', err);
        this.cargando = false;
        this.cdRef.detectChanges();
      }
    });
  }

  private procesarSolicitudes(lista: any[]) {
    this.solicitudesPendientesIds = [];
    this.premiosCanjeadosIds = [];

    if (!Array.isArray(lista)) return;

    lista.forEach((s: any) => {
      const idEstado = Number(s.id_estado_canje ?? s.id_estado ?? s.estado_id ?? s.estado_canje?.id_estado_canje ?? 0);
      const descEstado = String(s.descripcion ?? s.estado ?? s.descripcion_estado ?? s.estado_canje?.descripcion ?? '').toUpperCase();
      const idPremio = Number(s.id_premio ?? s.premio_id ?? s.premio?.id_premio ?? 0);

      const esPendiente = (idEstado === 1) || (descEstado.includes('SOLICITAD') && !descEstado.includes('APROBAD'));
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
  }

  private procesarCatalogoPremios(lista: any[]) {
    const idSedeAlumno = Number(
      this.usuarioLogueado?.id_sede ?? 
      this.usuarioLogueado?.sede?.id_sede ?? 
      this.usuarioLogueado?.alumno?.id_sede ?? 
      0
    );

    this.premios = (lista || [])
      .filter((item: any) => {
        const esVisible = item.estado_visibilidad === true || item.estado_visibilidad === 1 || String(item.estado_visibilidad) === 'true';
        if (!esVisible) return false;

        if (idSedeAlumno > 0 && Array.isArray(item.stock_sede) && item.stock_sede.length > 0) {
          const perteneceASede = item.stock_sede.some((st: any) => Number(st.id_sede) === idSedeAlumno);
          if (!perteneceASede) return false;
        }

        return true;
      })
      .map((item: any) => {
        const idPremioNum = Number(item.id_premio);

        let stockCalculado = 0;
        if (Array.isArray(item.stock_sede) && item.stock_sede.length > 0) {
          const stockSedeUsuario = item.stock_sede.find((st: any) => Number(st.id_sede) === idSedeAlumno);
          stockCalculado = Number(stockSedeUsuario ? stockSedeUsuario.cantidad : 0);
        } else if (item.cantidad !== undefined && item.cantidad !== null) {
          stockCalculado = Number(item.cantidad);
        } else {
          stockCalculado = Number(item.stock ?? item.cantidad_disponible ?? 0);
        }

        const costo = Number(item.puntos_requeridos ?? item.costo_puntos ?? 0);
        const idNivelRequerido = Number(item.id_nivel ?? item.nivel?.id_nivel ?? 1);
        const nombreNivelReq = item.nivel?.nombre_nivel || item.nombre_nivel || (idNivelRequerido === 3 ? 'Platino' : idNivelRequerido === 2 ? 'Oro' : 'Bronce');

        const cumpleNivel = (this.nivelUsuario.id_nivel ?? 1) >= idNivelRequerido;
        const estaPendiente = this.solicitudesPendientesIds.some(id => Number(id) === idPremioNum);
        const yaFueCanjeado = this.premiosCanjeadosIds.some(id => Number(id) === idPremioNum);

        let colorBoton = 'success';
        if (!cumpleNivel || yaFueCanjeado || stockCalculado <= 0 || this.misPuntos < costo) {
          colorBoton = 'medium';
        } else if (estaPendiente) {
          colorBoton = 'tertiary';
        }

        return {
          id_premio: idPremioNum,
          nombre: item.descripcion || item.nombre_premio || 'Premio',
          descripcion: item.descripcion || 'Sin descripción disponible.',
          costo_puntos: isNaN(costo) ? 0 : costo,
          stock: isNaN(stockCalculado) ? 0 : stockCalculado,
          imagen: item.imagen || 'assets/logo.png',
          id_nivel: idNivelRequerido,
          nombre_nivel: nombreNivelReq,
          cumple_nivel: cumpleNivel,
          color_boton: colorBoton,
          solicitado: estaPendiente,
          ya_canjeado: yaFueCanjeado,
          procesando: false
        };
      });
  }

  async confirmarCanje(premio: any) {
    if (!premio.cumple_nivel) {
      await this.mostrarToast(`Requiere Nivel ${premio.nombre_nivel}. Tu nivel actual es ${this.nivelUsuario.nombre_nivel}.`, 'warning');
      return;
    }

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
      message: `Enviarás una solicitud para canjear "${premio.nombre}" por ${premio.costo_puntos} puntos (Nivel ${premio.nombre_nivel}).`,
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

          // 1. Descuento optimista instantáneo
          this.misPuntos = Math.max(0, this.misPuntos - premio.costo_puntos);

          if (this.usuarioLogueado) {
            this.usuarioLogueado.puntaje_total = this.misPuntos;
            this.usuarioLogueado.puntaje = this.misPuntos;
            this.usuarioLogueado.puntos = this.misPuntos;
            this.actualizarSesionLocal(this.usuarioLogueado);
          }

          // 2. Marcado de solicitud enviada en memoria
          if (!this.solicitudesPendientesIds.includes(premio.id_premio)) {
            this.solicitudesPendientesIds.push(premio.id_premio);
          }
          if (!this.premiosCanjeadosIds.includes(premio.id_premio)) {
            this.premiosCanjeadosIds.push(premio.id_premio);
          }

          // 3. Re-evaluación rápida de catálogo para actualizar estado de botones
          this.procesarCatalogoPremios(this.rawCatalogo);
          this.cdRef.detectChanges();

          const msg = res?.mensaje || '¡Solicitud enviada con éxito!';
          await this.mostrarToast(msg, 'success');
        },
        error: async (err: any) => {
          premio.procesando = false;
          const mensajeError = err?.error?.detail || err?.error?.message || 'No se pudo procesar la solicitud.';
          await this.mostrarToast(mensajeError, 'danger');
          this.cdRef.detectChanges();
        }
      });
    }
  }

  async confirmarCancelacion(premio: any) {
    const alert = await this.alertController.create({
      header: 'Cancelar Solicitud',
      message: `¿Estás seguro de que deseas cancelar tu solicitud de "${premio.nombre}"? Se te reembolsarán ${premio.costo_puntos} puntos.`,
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

          // 1. Reembolso optimista instantáneo
          this.misPuntos = this.misPuntos + premio.costo_puntos;

          if (this.usuarioLogueado) {
            this.usuarioLogueado.puntaje_total = this.misPuntos;
            this.usuarioLogueado.puntaje = this.misPuntos;
            this.usuarioLogueado.puntos = this.misPuntos;
            this.actualizarSesionLocal(this.usuarioLogueado);
          }

          // 2. Liberar el estado en memoria
          this.solicitudesPendientesIds = this.solicitudesPendientesIds.filter(id => Number(id) !== Number(premio.id_premio));
          this.premiosCanjeadosIds = this.premiosCanjeadosIds.filter(id => Number(id) !== Number(premio.id_premio));

          // 3. Re-evaluar catálogo
          this.procesarCatalogoPremios(this.rawCatalogo);
          this.cdRef.detectChanges();

          const msg = res?.mensaje || 'Solicitud cancelada correctamente.';
          await this.mostrarToast(msg, 'success');
        },
        error: async (err: any) => {
          premio.procesando = false;
          const mensajeError = err?.error?.detail || err?.error?.message || 'No se pudo cancelar la solicitud.';
          await this.mostrarToast(mensajeError, 'danger');
          this.cdRef.detectChanges();
        }
      });
    }
  }

  private actualizarSesionLocal(usuarioObj: any) {
    if (!usuarioObj) return;
    const possibleKeys = ['usuarioLogueado', 'usuario', 'user', 'currentUser'];

    possibleKeys.forEach(key => {
      sessionStorage.setItem(key, JSON.stringify(usuarioObj));
      localStorage.setItem(key, JSON.stringify(usuarioObj));
    });

    if (this.alumnoService && typeof (this.alumnoService as any).notificarCambioUsuario === 'function') {
      (this.alumnoService as any).notificarCambioUsuario(usuarioObj);
    }
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