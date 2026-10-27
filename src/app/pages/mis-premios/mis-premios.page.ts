import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ActividadService } from 'src/app/services/actividad';
import { AlumnoService } from 'src/app/services/alumno';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-mis-premios',
  templateUrl: './mis-premios.page.html',
  styleUrls: ['./mis-premios.page.scss'],
  standalone: false
})
export class MisPremiosPage implements OnInit, OnDestroy {

  todosLosCanjes: any[] = [];
  canjesFiltrados: any[] = [];
  filtroEstado: string = 'TODOS';
  cargando: boolean = true;
  rutUsuario: string = '';

  private subUsuario!: Subscription;

  constructor(
    private actividadService: ActividadService,
    private alumnoService: AlumnoService,
    private router: Router,
    private cdRef: ChangeDetectorRef
  ) { }

  ngOnInit() {
    // Escucha cambios de la sesión activa en tiempo real
    this.subUsuario = this.alumnoService.usuario$.subscribe(usr => {
      if (usr) {
        this.obtenerRutYCanjes(usr);
      } else {
        this.cargando = false;
        this.router.navigate(['/login']);
      }
    });
  }

  ionViewWillEnter() {
    const usr = this.alumnoService.obtenerUsuarioSesion();
    if (usr) {
      this.obtenerRutYCanjes(usr);
    }
  }

  ngOnDestroy() {
    if (this.subUsuario) {
      this.subUsuario.unsubscribe();
    }
  }

  private limpiarRut(rut: any): string {
    if (!rut) return '';
    return String(rut).replace(/[^0-9kK]/g, '').trim().toUpperCase();
  }

  obtenerRutYCanjes(usuarioObj?: any) {
    this.cargando = true;

    const user = usuarioObj || this.alumnoService.obtenerUsuarioSesion();

    if (user) {
      const rawRut = user.rut_usuario || user.rut || user.alumno?.rut_usuario || user.alumno?.rut || '';
      this.rutUsuario = this.limpiarRut(rawRut);

      if (this.rutUsuario) {
        this.cargarMisCanjes(this.rutUsuario);
      } else {
        console.warn('No se encontró un RUT válido en la sesión');
        this.cargando = false;
        this.cdRef.detectChanges();
      }
    } else {
      this.cargando = false;
      this.router.navigate(['/login']);
    }
  }

  cargarMisCanjes(rut: string) {
    this.actividadService.getMisCanjes(rut).subscribe({
      next: (res: any) => {
        const lista = Array.isArray(res) ? res : (res?.data || res?.canjes || []);
        
        // Orden descendente por id_canje
        this.todosLosCanjes = lista.sort((a: any, b: any) => {
          const idA = Number(a.id_canje || a.id_solicitud || a.id || 0);
          const idB = Number(b.id_canje || b.id_solicitud || b.id || 0);
          return idB - idA;
        });

        this.filtrarCanjes();
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
      case 1: return 'time-outline';               // Solicitado
      case 2: return 'alert-circle-outline';       // Aprobado
      case 3: return 'checkmark-circle-outline';   // Retirado
      case 4: return 'close-circle-outline';       // Cancelado
      default: return 'help-circle-outline';
    }
  }

  filtrarCanjes() {
    if (this.filtroEstado === 'TODOS') {
      this.canjesFiltrados = [...this.todosLosCanjes];
      return;
    }

    this.canjesFiltrados = this.todosLosCanjes.filter(item => {
      const idEstado = Number(item.id_estado_canje || item.estado_canje?.id_estado_canje || 0);
      const desc = String(item.estado_canje?.descripcion || item.estado || '').toUpperCase();

      switch (this.filtroEstado) {
        case 'SOLICITAD':
        case 'SOLICITADO':
          return idEstado === 1 || desc.includes('SOLICITAD');
        case 'APROBADO':
          return idEstado === 2 || desc.includes('APROBAD');
        case 'RETIRADO':
          return idEstado === 3 || desc.includes('RETIRAD');
        case 'CANCELADO':
          return idEstado === 4 || desc.includes('CANCELAD');
        default:
          return true;
      }
    });
  }

  obtenerBadgeColor(idEstado?: number, descripcion?: string): string {
    const id = Number(idEstado || 0);
    const desc = String(descripcion || '').toUpperCase();

    if (id === 1 || desc.includes('SOLICITAD')) return 'medium';
    if (id === 2 || desc.includes('APROBAD')) return 'warning';
    if (id === 3 || desc.includes('RETIRAD')) return 'success';
    if (id === 4 || desc.includes('CANCELAD')) return 'danger';

    return 'primary';
  }

  obtenerTextoEntrega(item: any): string {
    const id = Number(item.id_estado_canje || item.estado_canje?.id_estado_canje || 0);
    const desc = String(item.estado_canje?.descripcion || item.estado || '').toUpperCase();

    if (id === 1 || desc.includes('SOLICITAD')) {
      return 'Solicitud ingresada, pendiente de revisión';
    }
    if (id === 2 || desc.includes('APROBAD')) {
      return 'Listo para retirar en la sede correspondiente';
    }
    if (id === 3 || desc.includes('RETIRAD')) {
      return 'Entregado al estudiante';
    }
    if (id === 4 || desc.includes('CANCELAD')) {
      return 'Solicitud cancelada';
    }
    return 'En proceso';
  }
}