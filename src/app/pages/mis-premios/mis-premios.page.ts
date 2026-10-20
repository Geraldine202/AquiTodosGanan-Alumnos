import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ActividadService } from 'src/app/services/actividad';

@Component({
  selector: 'app-mis-premios',
  templateUrl: './mis-premios.page.html',
  styleUrls: ['./mis-premios.page.scss'],
  standalone: false
})
export class MisPremiosPage implements OnInit {

  todosLosCanjes: any[] = [];
  canjesFiltrados: any[] = [];
  filtroEstado: string = 'TODOS';
  cargando: boolean = true;
  rutUsuario: string = '';

  constructor(
    private actividadService: ActividadService,
    private router: Router,
    private cdRef: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.obtenerRutYCanjes();
  }

  ionViewWillEnter() {
    this.obtenerRutYCanjes();
  }

  /**
   * Obtiene el RUT desde sessionStorage y llama al servicio
   */
  obtenerRutYCanjes() {
    this.cargando = true;

    const possibleKeys = [
      'usuarioLogueado', 'usuario', 'user', 'currentUser', 'rut_usuario'
    ];

    let sessionData: any = null;

    for (const key of possibleKeys) {
      const val = sessionStorage.getItem(key);
      if (val) {
        sessionData = val;
        break;
      }
    }

    if (sessionData) {
      try {
        const user = typeof sessionData === 'string' && sessionData.trim().startsWith('{')
          ? JSON.parse(sessionData)
          : { rut_usuario: sessionData };

        this.rutUsuario = user.rut_usuario || user.rut || user.alumno?.rut_usuario || user.alumno?.rut || '';

        if (this.rutUsuario) {
          this.rutUsuario = String(this.rutUsuario).replace(/\./g, '').trim();
          this.cargarMisCanjes(this.rutUsuario);
        } else {
          console.warn('No se encontró el RUT en la sesión del usuario');
          this.cargando = false;
        }
      } catch (e) {
        console.error('Error al leer datos de la sesión:', e);
        this.cargando = false;
      }
    } else {
      this.cargando = false;
      this.router.navigate(['/login']);
    }
  }

  /**
   * Consume el endpoint del backend y ordena descendentemente por el último canje
   */
  cargarMisCanjes(rut: string) {
    this.actividadService.getMisCanjes(rut).subscribe({
      next: (res: any) => {
        const lista = Array.isArray(res) ? res : (res?.data || res?.canjes || []);
        
        // ORDENAMIENTO DESCENDENTE (El último canje realizado queda de primero)
        this.todosLosCanjes = lista.sort((a:any, b:any) => {
          const idA = Number(a.id_canje || a.id_solicitud || a.id || 0);
          const idB = Number(b.id_canje || b.id_solicitud || b.id || 0);
          return idB - idA;
        });

        this.filtrarCanjes(); // Aplica el filtro
        
        this.cargando = false;
        this.cdRef.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al cargar canjes:', err);
        this.todosLosCanjes = [];
        this.canjesFiltrados = [];
        this.cargando = false;
        this.cdRef.detectChanges();
      }
    });
  }

  obtenerIconoEstado(idEstado?: number): string {
    switch (idEstado) {
      case 1: return 'time-outline';               // Solicitado (Reloj)
      case 2: return 'alert-circle-outline';       // Aprobado (Alerta/Pendiente retiro)
      case 3: return 'checkmark-circle-outline';  // Retirado (Check verde)
      case 4: return 'close-circle-outline';      // Cancelado (Cruz roja)
      default: return 'help-circle-outline';
    }
  }

  /**
   * Filtra los canjes según la pestaña seleccionada en el ion-segment
   */
  filtrarCanjes() {
    if (this.filtroEstado === 'TODOS') {
      this.canjesFiltrados = [...this.todosLosCanjes];
      return;
    }

    this.canjesFiltrados = this.todosLosCanjes.filter(item => {
      const idEstado = item.id_estado_canje || item.estado_canje?.id_estado_canje;
      const desc = (item.estado_canje?.descripcion || item.estado || '').toUpperCase();

      switch (this.filtroEstado) {
        case 'SOLICITADO':
          return idEstado === 1 || desc.includes('SOLICITADO');
        case 'APROBADO':
          return idEstado === 2 || desc.includes('APROBADO');
        case 'RETIRADO':
          return idEstado === 3 || desc.includes('RETIRADO');
        case 'CANCELADO':
          return idEstado === 4 || desc.includes('CANCELADO');
        default:
          return true;
      }
    });
  }

  /**
   * Asigna colores a los Badges según el id_estado_canje
   */
  obtenerBadgeColor(idEstado?: number, descripcion?: string): string {
    const id = idEstado || 0;
    const desc = (descripcion || '').toUpperCase();

    if (id === 1 || desc.includes('SOLICITADO')) return 'medium';   // Solicitado (Gris)
    if (id === 2 || desc.includes('APROBADO')) return 'warning';    // Aprobado (Amarillo/Naranja)
    if (id === 3 || desc.includes('RETIRADO')) return 'success';    // Retirado (Verde)
    if (id === 4 || desc.includes('CANCELADO')) return 'danger';    // Cancelado (Rojo)

    return 'primary';
  }

  /**
   * Genera el texto del estado de entrega en la tarjeta
   */
  obtenerTextoEntrega(item: any): string {
    const id = item.id_estado_canje || item.estado_canje?.id_estado_canje;
    const desc = (item.estado_canje?.descripcion || item.estado || '').toUpperCase();

    if (id === 1 || desc.includes('SOLICITADO')) {
      return 'Solicitud ingresada, pendiente de revisión';
    }
    if (id === 2 || desc.includes('APROBADO')) {
      return 'Listo para retirar en la sede correspondiente';
    }
    if (id === 3 || desc.includes('RETIRADO')) {
      return 'Entregado al estudiante';
    }
    if (id === 4 || desc.includes('CANCELADO')) {
      return 'Solicitud cancelada';
    }
    return 'En proceso';
  }
}