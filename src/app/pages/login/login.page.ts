import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
import { AlumnoService } from '../../services/alumno'; 
import { ActividadService } from '../../services/actividad'; // 1. Importar ActividadService
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {

  credenciales = {
    correo: '',
    password: ''
  };

  mostrarPassword: boolean = false;

  intentosFallidos: number = 0;
  maxIntentos: number = 3;
  bloqueadoTemporalmente: boolean = false;
  segundosRestantes: number = 0;
  private timerBloqueo: any = null;
  private ultimoCorreoIntento: string = '';

  constructor(
    private alumnoService: AlumnoService,
    private actividadService: ActividadService, // 2. Inyectar ActividadService
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private navCtrl: NavController
  ) { }

  ngOnInit() {
    this.cerrarSesionCompleta();
  }

  ionViewWillEnter() {
    this.cerrarSesionCompleta();
  }

  cerrarSesionCompleta() {
    localStorage.clear();
    sessionStorage.clear();
    this.limpiarFormulario();
  }

  limpiarFormulario() {
    this.credenciales = {
      correo: '',
      password: ''
    };
    this.mostrarPassword = false;
  }

  toggleMostrarPassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  async iniciarSesion() {
    if (this.bloqueadoTemporalmente) {
      this.mostrarAlerta(
        'Acceso Bloqueado', 
        `Has superado el límite de intentos. Por favor espera ${this.segundosRestantes} segundos antes de reintentar.`
      );
      return;
    }

    const correoLimpio = this.credenciales.correo.trim().toLowerCase();
    const passLimpia = this.credenciales.password.trim();

    if (!correoLimpio || !passLimpia) {
      this.mostrarAlerta('Campos Vacíos', 'Por favor, ingresa tu correo institucional y contraseña.');
      return;
    }

    if (this.ultimoCorreoIntento !== correoLimpio) {
      this.intentosFallidos = 0;
      this.ultimoCorreoIntento = correoLimpio;
    }

    const loading = await this.loadingController.create({
      message: 'Autenticando usuario...',
      spinner: 'crescent'
    });
    await loading.present();

    this.alumnoService.login({ correo: correoLimpio, password: passLimpia }).subscribe({
      next: async (res: any) => { // Marca como ASYNC para consultar puntos antes de quitar el spinner
        this.intentosFallidos = 0;

        const usuarioData = res.usuario || res.alumno || res;

        const idTipoUsuario = Number(
          usuarioData?.id_tipo_usuario ?? 
          usuarioData?.tipo_usuario?.id_tipo_usuario ?? 
          0
        );

        const rolesPermitidos = [1, 3, 4];

        if (!rolesPermitidos.includes(idTipoUsuario)) {
          loading.dismiss();
          this.cerrarSesionCompleta();
          this.mostrarAlerta(
            'Acceso No Autorizado', 
            'Esta aplicación está destinada únicamente a Estudiantes, Docentes y Consejeros de Carrera.'
          );
          return;
        }

        // 3. CONSULTA DE PUNTOS Y NIVEL PREVIA A LA NAVEGACIÓN
        const rutLimpio = String(usuarioData?.rut_usuario || usuarioData?.rut || '').replace(/[^0-9kK]/g, '').trim();
        
if (rutLimpio && (idTipoUsuario === 1 || idTipoUsuario === 4)) {
          try {
            const servicioAny: any = this.actividadService;
            
            // Traer Puntos (Tipado a : any para evitar TS2339)
            if (typeof servicioAny.getPuntajeTotal === 'function') {
              const resPuntos: any = await firstValueFrom(servicioAny.getPuntajeTotal(rutLimpio));
              const puntosObtenidos = Number(
                resPuntos?.puntaje_total ?? resPuntos?.puntaje ?? resPuntos?.puntos ?? 
                (typeof resPuntos === 'number' ? resPuntos : 0)
              );
              usuarioData.puntaje_total = puntosObtenidos;
              usuarioData.puntaje = puntosObtenidos;
              usuarioData.puntos = puntosObtenidos;
            }

            // Traer Nivel (Tipado a : any para evitar TS2339)
            if (typeof servicioAny.getNivelUsuario === 'function') {
              const resNivel: any = await firstValueFrom(servicioAny.getNivelUsuario(rutLimpio));
              if (resNivel) {
                usuarioData.nivelUsuarioInfo = resNivel;
                usuarioData.nivelAlumno = resNivel.nombre_nivel || 'Bronce';
                const idNivel = Number(resNivel.id_nivel ?? 1);
                usuarioData.colorNivel = idNivel === 3 ? 'medium' : idNivel === 2 ? 'warning' : 'tertiary';
              }
            }
          } catch (errPuntos) {
            console.warn('No se pudieron precargar los puntos en el login:', errPuntos);
          }
        }

        // 4. GUARDAR EN SESSIONSTORAGE CON LOS PUNTOS YA INCLUIDOS
        if (usuarioData && usuarioData.rut_usuario) {
          sessionStorage.setItem('rut_usuario', usuarioData.rut_usuario);
          sessionStorage.setItem('usuario', JSON.stringify(usuarioData));
          sessionStorage.setItem('usuarioLogueado', JSON.stringify(usuarioData));
        }
        
        if (res.token_acceso) {
          sessionStorage.setItem('token_acceso', res.token_acceso);
        }

        if (this.alumnoService.guardarSesion) {
          this.alumnoService.guardarSesion(usuarioData);
        }

        const cambioObligatorio = usuarioData.cambio_clave_obligatorio;
        this.limpiarFormulario();
        
        loading.dismiss(); // Cerrar loading justo antes de cambiar de pantalla

        if (cambioObligatorio) {
          this.navCtrl.navigateRoot('/cambiar-clave-primer-login');
        } else {
          this.navCtrl.navigateRoot('/home');
        }
      },
      error: (err: any) => {
        loading.dismiss();

        this.intentosFallidos++;
        const mensajeError = err.error?.error || err.error?.detail || 'Las credenciales ingresadas no coinciden.';

        if (this.intentosFallidos >= this.maxIntentos) {
          this.iniciarBloqueoTemporal();
          this.mostrarAlerta(
            'Cuenta Bloqueada Temporalmente', 
            `Has fallado ${this.maxIntentos} intentos consecutivos. Por seguridad, la cuenta ha sido bloqueada por 60 segundos.`
          );
        } else {
          const restantes = this.maxIntentos - this.intentosFallidos;
          this.mostrarAlerta(
            'Error de Acceso', 
            `${mensajeError}\n\nTe quedan ${restantes} intento(s) antes del bloqueo temporal.`
          );
        }
      }
    });
  }

  private iniciarBloqueoTemporal() {
    this.bloqueadoTemporalmente = true;
    this.segundosRestantes = 60;

    if (this.timerBloqueo) {
      clearInterval(this.timerBloqueo);
    }

    this.timerBloqueo = setInterval(() => {
      this.segundosRestantes--;
      if (this.segundosRestantes <= 0) {
        clearInterval(this.timerBloqueo);
        this.bloqueadoTemporalmente = false;
        this.intentosFallidos = 0;
      }
    }, 1000);
  }

  async mostrarAlerta(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['Aceptar']
    });
    await alert.present();
  }
}