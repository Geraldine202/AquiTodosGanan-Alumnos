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

  misCanjes: any[] = [];
  canjesFiltrados: any[] = [];
  filtroEstado: string = 'TODOS';
  cargando: boolean = true;
  usuarioLogueado: any = null;

  constructor(
    private actividadService: ActividadService,
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

    // 1. Obtener datos de sesión
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
        this.usuarioLogueado = { rut_usuario: sessionData };
      }
    } catch (e) {
      this.usuarioLogueado = { rut_usuario: sessionData };
    }

    const rutUsuario = this.usuarioLogueado?.rut_usuario || this.usuarioLogueado?.rut || this.usuarioLogueado?.id;
    const servicioAny: any = this.actividadService;

    // 2. Cargar solicitudes de canje asociadas al estudiante
    const peticion$ = typeof servicioAny.getMisCanjes === 'function' 
      ? servicioAny.getMisCanjes(rutUsuario)
      : this.actividadService.getActividades(); // Fallback si no está declarado getMisCanjes en el servicio

    peticion$.subscribe({
      next: (res: any) => {
        const lista: any[] = Array.isArray(res) ? res : (res?.data || []);
        
        // Formatear los registros basándonos en las tablas:
        // solicitud_canje, premio, estado_canje, detalle_canje y retiro_premio
        this.misCanjes = lista.map((item: any) => ({
          id_canje: item.id_canje,
          fecha_solicitud: item.fecha_solicitud || new Date(),
          costo_puntaje: item.costo_puntaje || item.puntos_usados || 0,
          estado_canje: item.estado_canje || { descripcion: item.estado || 'Pendiente' },
          premio: item.premio || {
            descripcion: item.nombre_premio || 'Premio Canjeado',
            imagen: item.imagen || 'assets/slide1.jpg'
          },
          detalle_canje: item.detalle_canje || {
            lugar_entrega: item.lugar_entrega || 'Sede Principal - DAE'
          },
          retiro_premio: item.retiro_premio || {
            fecha_limite: item.fecha_limite || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            retirado: item.retirado !== undefined ? item.retirado : false
          }
        }));

        this.filtrarCanjes();
        this.cargando = false;
        this.cdRef.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al cargar mis canjes:', err);
        this.misCanjes = [];
        this.filtrarCanjes();
        this.cargando = false;
        this.cdRef.detectChanges();
      }
    });
  }

  filtrarCanjes() {
    if (this.filtroEstado === 'TODOS') {
      this.canjesFiltrados = [...this.misCanjes];
    } else if (this.filtroEstado === 'RETIRADO') {
      this.canjesFiltrados = this.misCanjes.filter(c => c.retiro_premio?.retirado === true);
    } else if (this.filtroEstado === 'PENDIENTE') {
      this.canjesFiltrados = this.misCanjes.filter(c => !c.retiro_premio?.retirado);
    }
  }

  obtenerBadgeColor(estado: string): string {
    if (!estado) return 'primary';
    const est = estado.toLowerCase();
    if (est.includes('entregado') || est.includes('completado') || est.includes('retirado')) {
      return 'success';
    }
    if (est.includes('pendiente') || est.includes('solicitado')) {
      return 'warning';
    }
    if (est.includes('cancelado') || est.includes('rechazado')) {
      return 'danger';
    }
    return 'primary';
  }
}