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
   * Obtiene el RUT desde el almacenamiento local y llama al servicio
   */
  obtenerRutYCanjes() {
    this.cargando = true;

    const sessionData = localStorage.getItem('usuarioLogueado') || 
                        localStorage.getItem('usuario') || 
                        localStorage.getItem('user') ||
                        sessionStorage.getItem('usuarioLogueado');

    if (sessionData) {
      try {
        const user = JSON.parse(sessionData);
        this.rutUsuario = user.rut_usuario || user.rut || user.alumno?.rut_usuario || user.alumno?.rut || '';

        if (this.rutUsuario) {
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
   * Consume el endpoint actualizado del backend
   */
  cargarMisCanjes(rut: string) {
    this.actividadService.getMisCanjes(rut).subscribe({
      next: (res: any) => {
        const lista = Array.isArray(res) ? res : (res?.data || res?.canjes || []);
        
        this.todosLosCanjes = lista;
        this.filtrarCanjes(); // Aplica el filtro (por defecto 'TODOS')
        
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

    if (id === 1 || desc.includes('SOLICITADO')) return 'medium';   // Solicitado (Gris/Grisáceo)
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