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
  cargando: boolean = true;
  procesando: boolean = false;
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

  cargarDatos() {
    this.cargando = true;

    // 1. Cargar Sesión del Usuario desde el almacenamiento local
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

    try {
      if (typeof sessionData === 'string' && sessionData.trim().startsWith('{')) {
        this.usuarioLogueado = JSON.parse(sessionData);
      } else {
        this.usuarioLogueado = { rut_usuario: sessionData };
      }
    } catch (e) {
      this.usuarioLogueado = { rut_usuario: sessionData };
    }

    const rut = this.usuarioLogueado?.rut_usuario || this.usuarioLogueado?.rut;

    // 2. Consultar Puntos Actuales y Catálogo
    this.obtenerPuntosUsuario(rut);
    this.obtenerCatalogoPremios();
  }

  private obtenerPuntosUsuario(rut: string) {
    const servicioAny: any = this.actividadService;

    if (rut && typeof servicioAny.getPuntajeTotal === 'function') {
      servicioAny.getPuntajeTotal(rut).subscribe({
        next: (res: any) => {
          this.misPuntos = res?.puntaje ?? res?.puntos ?? this.usuarioLogueado?.puntaje_total ?? 0;
          this.cdRef.detectChanges();
        },
        error: () => {
          this.misPuntos = this.usuarioLogueado?.puntaje_total || 0;
          this.cdRef.detectChanges();
        }
      });
    } else {
      this.misPuntos = this.usuarioLogueado?.puntaje_total || 0;
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

        this.premios = lista
          .map((item: any) => {
            const esVisible = item.estado_visibilidad === true ||
                              item.estado_visibilidad === 'true' ||
                              item.estado_visibilidad === 1;

            // 1. Extraer stock soportando estructuras simples o JOINs de Supabase
            let stockCalculado = 0;

            if (item.stock_sede !== undefined && item.stock_sede !== null) {
              if (Array.isArray(item.stock_sede) && item.stock_sede.length > 0) {
                stockCalculado = Number(item.stock_sede[0]?.cantidad ?? item.stock_sede[0]?.stock ?? 0);
              } else {
                stockCalculado = Number(item.stock_sede);
              }
            } else {
              const posibleStock = item.stock ?? item.cantidad_disponible ?? item.stock_disponible ?? item.cantidad;
              stockCalculado = Number(posibleStock ?? 0);
            }

            // 2. Extraer costo en puntos
            const costo = Number(item.puntos_requeridos ?? item.costo_puntos ?? item.puntos ?? 0);

            return {
              id_premio: item.id_premio || item.id,
              nombre: item.nombre_premio || item.descripcion || item.nombre || 'Premio de Catálogo',
              descripcion: item.descripcion || 'Sin descripción disponible.',
              costo_puntos: isNaN(costo) ? 0 : costo,
              stock: isNaN(stockCalculado) ? 0 : stockCalculado,
              imagen: item.imagen || 'assets/slide1.jpg',
              estado_visibilidad: esVisible
            };
          })
          .filter(p => p.estado_visibilidad === true);

        this.cargando = false;
        this.cdRef.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al cargar premios:', err);
        this.cargando = false;
        this.cdRef.detectChanges();
      }
    });
  }

  async confirmarCanje(premio: any) {
    // Validaciones preventivas en cliente
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
      message: `Enviarás una solicitud para canjear "${premio.nombre}" por ${premio.costo_puntos} puntos. El descuento de puntos y entrega quedarán pendientes de aprobación por el administrador.`,
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
    this.procesando = true;
    const rut = this.usuarioLogueado?.rut_usuario || this.usuarioLogueado?.rut;
    const servicioAny: any = this.actividadService;

    // Construcción del Payload para la solicitud de canje
    const payload: SolicitudCanjePayload = {
      rut_alumno: rut,
      id_premio: premio.id_premio,
      lugar_entrega: 'Sede Central'
    };

    if (typeof servicioAny.canjearPremio === 'function') {
      servicioAny.canjearPremio(payload).subscribe({
        next: async (res: any) => {
          this.procesando = false;

          // Se mantiene el saldo de puntos (ya que el descuento ocurrirá tras la aprobación del admin)
          const saldoInvariable = res?.saldo_restante !== undefined ? res.saldo_restante : this.misPuntos;
          this.actualizarPuntosLocales(saldoInvariable);

          const msg = res?.mensaje || '¡Solicitud enviada con éxito! Pendiente de aprobación por un administrador.';
          await this.mostrarToast(msg, 'success');

          // Refrescar el catálogo para mantener sincrónicos los datos
          this.obtenerCatalogoPremios();
        },
        error: async (err: any) => {
          console.error('Error al registrar solicitud de canje:', err);
          this.procesando = false;

          // Extraer mensaje devuelto por FastAPI (detail)
          const mensajeError = err?.error?.detail || err?.error?.message || 'No se pudo procesar la solicitud.';
          await this.mostrarToast(mensajeError, 'danger');
        }
      });
    } else {
      // Simulación en entorno de desarrollo/pruebas locales
      setTimeout(async () => {
        this.procesando = false;
        await this.mostrarToast('¡Solicitud de canje enviada con éxito! Queda pendiente de aprobación.', 'success');
      }, 1000);
    }
  }

  actualizarPuntosLocales(nuevoSaldo: number) {
    this.misPuntos = nuevoSaldo;

    if (this.usuarioLogueado) {
      this.usuarioLogueado.puntaje_total = this.misPuntos;
      
      const possibleKeys = ['usuario', 'user', 'currentUser', 'usuarioLogueado'];
      for (const key of possibleKeys) {
        if (localStorage.getItem(key)) {
          localStorage.setItem(key, JSON.stringify(this.usuarioLogueado));
        }
        if (sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, JSON.stringify(this.usuarioLogueado));
        }
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