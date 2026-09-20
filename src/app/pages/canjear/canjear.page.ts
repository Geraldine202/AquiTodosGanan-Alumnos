import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { ActividadService } from 'src/app/services/actividad';

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

    // 1. Cargar Sesión del Usuario
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

    // 2. Cargar Puntos Actualizados y Lista de Premios
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
        }
      });
    } else {
      this.misPuntos = this.usuarioLogueado?.puntaje_total || 0;
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

            return {
              id_premio: item.id_premio,
              nombre: item.descripcion || item.nombre_premio || 'Premio de Catálogo',
              descripcion: item.descripcion || 'Sin descripción disponible.',
              costo_puntos: item.puntos_requeridos ?? item.costo_puntos ?? 0,
              stock: item.cantidad ?? item.stock ?? 0, // Mapea 'cantidad' proveniente de stock_sede
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
    // Validación 1: Puntos suficientes
    if (this.misPuntos < premio.costo_puntos) {
      await this.mostrarToast('Puntos insuficientes para este premio.', 'warning');
      return;
    }

    // Validación 2: Stock disponible
    if (premio.stock <= 0) {
      await this.mostrarToast('Este premio se encuentra agotado.', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirmar Canje',
      message: `¿Deseas canjear "${premio.nombre}" por ${premio.costo_puntos} puntos?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar Canje',
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

    if (typeof servicioAny.canjearPremio === 'function') {
      servicioAny.canjearPremio(rut, premio.id_premio).subscribe({
        next: async () => {
          this.descontarPuntosLocales(premio.costo_puntos);
          premio.stock--;
          this.procesando = false;
          await this.mostrarToast('¡Canje realizado con éxito!', 'success');
        },
        error: async (err: any) => {
          console.error('Error procesando canje:', err);
          this.procesando = false;
          await this.mostrarToast(err?.error?.message || 'No se pudo procesar el canje.', 'danger');
        }
      });
    } else {
      // Simulación en desarrollo
      setTimeout(async () => {
        this.descontarPuntosLocales(premio.costo_puntos);
        premio.stock--;
        this.procesando = false;
        await this.mostrarToast('¡Canje realizado con éxito!', 'success');
      }, 1000);
    }
  }

  descontarPuntosLocales(puntosARestar: number) {
    this.misPuntos -= puntosARestar;

    if (this.usuarioLogueado) {
      this.usuarioLogueado.puntaje_total = this.misPuntos;
      const keySesion = localStorage.getItem('usuario') ? 'usuario' : 'currentUser';
      if (localStorage.getItem(keySesion)) {
        localStorage.setItem(keySesion, JSON.stringify(this.usuarioLogueado));
      }
    }

    this.cdRef.detectChanges();
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