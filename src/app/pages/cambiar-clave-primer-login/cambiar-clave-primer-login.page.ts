import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
import { AlumnoService } from 'src/app/services/alumno';

@Component({
  selector: 'app-cambiar-clave-primer-login',
  templateUrl: './cambiar-clave-primer-login.page.html',
  styleUrls: ['./cambiar-clave-primer-login.page.scss'],
  standalone: false
})
export class CambiarClavePrimerLoginPage implements OnInit {

  datosClave = {
    nuevaPassword: '',
    confirmarPassword: ''
  };

  mostrarNuevaClave: boolean = false;
  mostrarConfirmarClave: boolean = false;
  guardando: boolean = false;

  // Estado de evaluación de las 5 reglas de seguridad
  requisitosPass = {
    longitud: false,
    mayuscula: false,
    minuscula: false,
    numero: false,
    especial: false
  };

  constructor(
    private alumnoService: AlumnoService,
    private navCtrl: NavController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private cdRef: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.validarPasswordEnVivo();
  }

  toggleNuevaClave() {
    this.mostrarNuevaClave = !this.mostrarNuevaClave;
  }

  toggleConfirmarClave() {
    this.mostrarConfirmarClave = !this.mostrarConfirmarClave;
  }

  /**
   * Evalúa las reglas de seguridad en tiempo real a medida que escribe el usuario
   */
  validarPasswordEnVivo() {
    const pass = this.datosClave.nuevaPassword || '';

    this.requisitosPass.longitud = pass.length >= 8;
    this.requisitosPass.mayuscula = /[A-Z]/.test(pass);
    this.requisitosPass.minuscula = /[a-z]/.test(pass);
    this.requisitosPass.numero = /\d/.test(pass);
    this.requisitosPass.especial = /[@$!%*?&#.\-_/*+]/.test(pass);

    this.cdRef.detectChanges();
  }

  /**
   * Retorna true si se cumplen los 5 requisitos de contraseña
   */
  private esPasswordValida(): boolean {
    return this.requisitosPass.longitud &&
           this.requisitosPass.mayuscula &&
           this.requisitosPass.minuscula &&
           this.requisitosPass.numero &&
           this.requisitosPass.especial;
  }

  async guardarNuevaClave() {
    const { nuevaPassword, confirmarPassword } = this.datosClave;

    if (!nuevaPassword.trim() || !confirmarPassword.trim()) {
      this.mostrarAlerta('Campos incompletos', 'Por favor, completa ambos campos requeridos.');
      return;
    }

    if (!this.esPasswordValida()) {
      this.mostrarAlerta(
        'Contraseña insegura', 
        'La nueva contraseña debe cumplir con todos los requisitos mínimos de seguridad (8+ caracteres, mayúscula, minúscula, número y carácter especial).'
      );
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      this.mostrarAlerta('Error de coincidencia', 'Las contraseñas ingresadas no coinciden.');
      return;
    }

    // LEER DESDE sessionStorage EN LUGAR DE localStorage
    const rutUsuario = sessionStorage.getItem('rut_usuario') || 
                       JSON.parse(sessionStorage.getItem('usuario') || '{}')?.rut_usuario ||
                       JSON.parse(sessionStorage.getItem('usuarioLogueado') || '{}')?.rut_usuario;

    if (!rutUsuario) {
      this.mostrarAlerta('Sesión no encontrada', 'No se encontró la información de tu usuario. Por favor vuelve a ingresar.');
      this.navCtrl.navigateRoot('/login');
      return;
    }

    this.guardando = true;

    const loading = await this.loadingController.create({
      message: 'Actualizando contraseña...',
      spinner: 'crescent'
    });
    await loading.present();

    this.alumnoService.cambiarPasswordObligatorio(rutUsuario, nuevaPassword).subscribe({
      next: async () => {
        this.guardando = false;
        await loading.dismiss();
        
        // Actualizar la sesión en sessionStorage desactivando la bandera obligatoria
        const clavesSession = ['usuario', 'usuarioLogueado', 'user'];
        clavesSession.forEach(key => {
          const str = sessionStorage.getItem(key);
          if (str) {
            try {
              const obj = JSON.parse(str);
              obj.cambio_clave_obligatorio = false;
              sessionStorage.setItem(key, JSON.stringify(obj));
            } catch (e) {}
          }
        });

        const alert = await this.alertController.create({
          header: '¡Contraseña Actualizada!',
          message: 'Tu nueva contraseña ha sido registrada con éxito. Ya puedes acceder al sistema.',
          buttons: [{
            text: 'Continuar al Inicio',
            handler: () => {
              this.navCtrl.navigateRoot('/home');
            }
          }]
        });
        await alert.present();
      },
      error: async (err: any) => {
        this.guardando = false;
        await loading.dismiss();
        console.error('Error al cambiar contraseña:', err);
        const msg = err.error?.error || err.error?.detail || err.error?.message || 'No se pudo actualizar la contraseña. Revisa la conexión.';
        this.mostrarAlerta('Error', msg);
      }
    });
  }

  private async mostrarAlerta(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['Aceptar']
    });
    await alert.present();
  }
}