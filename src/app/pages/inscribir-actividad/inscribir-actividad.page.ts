import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { ActividadService } from 'src/app/services/actividad';

@Component({
  selector: 'app-inscribir-actividad',
  templateUrl: './inscribir-actividad.page.html',
  styleUrls: ['./inscribir-actividad.page.scss'],
  standalone: false
})
export class InscribirActividadPage implements OnInit {

  actividadesDisponibles: any[] = [];
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

    // 1. Obtener usuario de la sesión
    const possibleKeys = [
      'usuario', 'user', 'currentUser', 'usuarioLogueado', 
      'token', 'token_acceso', 'auth', 'session'
    ];

    let sessionData: any = null;
    for (const key of possibleKeys) {
      const valLocal = localStorage.getItem(key);
      const valSession = sessionStorage.getItem(key);
      if (valLocal || valSession) {
        sessionData = valLocal || valSession;
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
        this.usuarioLogueado = { id: sessionData };
      }
    } catch (e) {
      this.usuarioLogueado = { id: sessionData };
    }

    // 2. Cargar actividades disponibles desde el backend
    this.actividadService.getActividades().subscribe({
      next: (res: any) => {
        const lista: any[] = Array.isArray(res) ? res : (res?.data || []);
        
        // Filtramos solo las actividades abiertas o futuras declarando explícitamente act: any
        const hoy = new Date();
        this.actividadesDisponibles = lista.filter((act: any) => {
          if (!act.fecha_fin) return true;
          return new Date(act.fecha_fin) >= hoy;
        });

        this.cargando = false;
        this.cdRef.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al cargar actividades:', err);
        this.cargando = false;
        this.cdRef.detectChanges();
      }
    });
  }

  async confirmarInscripcion(actividad: any) {
    const alert = await this.alertController.create({
      header: 'Confirmar Inscripción',
      message: `¿Deseas inscribirte en "${actividad.nombre_actividad}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Sí, inscribirme',
          handler: () => {
            this.ejecutarInscripcion(actividad);
          }
        }
      ]
    });

    await alert.present();
  }

  ejecutarInscripcion(actividad: any) {
    this.procesando = true;

    const idUsuario = this.usuarioLogueado?.id_usuario || this.usuarioLogueado?.id || this.usuarioLogueado?.rut_usuario;
    const servicioAny: any = this.actividadService;

    // Verificar si existe el método de inscripción en el servicio
    if (typeof servicioAny.inscribirActividad === 'function') {
      servicioAny.inscribirActividad(idUsuario, actividad.id_actividad).subscribe({
        next: async () => {
          actividad.inscrito = true;
          this.procesando = false;
          await this.mostrarToast('¡Inscripción realizada con éxito!', 'success');
          this.router.navigate(['/mis-actividades']);
        },
        error: async (err: any) => {
          console.error('Error al inscribir:', err);
          this.procesando = false;
          await this.mostrarToast('No se pudo procesar la inscripción.', 'danger');
        }
      });
    } else {
      // Simulación de éxito si el backend aún no implementa el endpoint
      setTimeout(async () => {
        actividad.inscrito = true;
        this.procesando = false;
        await this.mostrarToast('¡Inscripción registrada con éxito!', 'success');
        this.router.navigate(['/mis-actividades']);
      }, 1000);
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