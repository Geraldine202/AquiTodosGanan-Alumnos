import { Component, OnInit } from '@angular/core';
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

  constructor(
    private alumnoService: AlumnoService,
    private navCtrl: NavController,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) { }

  ngOnInit() { }

  toggleNuevaClave() {
    this.mostrarNuevaClave = !this.mostrarNuevaClave;
  }

  toggleConfirmarClave() {
    this.mostrarConfirmarClave = !this.mostrarConfirmarClave;
  }

  async guardarNuevaClave() {
    const { nuevaPassword, confirmarPassword } = this.datosClave;

    if (!nuevaPassword.trim() || !confirmarPassword.trim()) {
      this.mostrarAlerta('Campos incompletos', 'Por favor, completa ambos campos requeridos.');
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      this.mostrarAlerta('Error de coincidencia', 'Las contraseñas ingresadas no coinciden.');
      return;
    }

    if (nuevaPassword.length < 6) {
      this.mostrarAlerta('Contraseña débil', 'La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    const rutUsuario = localStorage.getItem('rut_usuario');
    if (!rutUsuario) {
      this.navCtrl.navigateRoot('/login');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Actualizando contraseña...',
      spinner: 'crescent'
    });
    await loading.present();

    this.alumnoService.cambiarPasswordObligatorio(rutUsuario, nuevaPassword).subscribe({
      next: async () => {
        await loading.dismiss();
        
        // Actualizar almacenamiento local
        const usuarioLocalStr = localStorage.getItem('usuario');
        if (usuarioLocalStr) {
          const usuarioLocal = JSON.parse(usuarioLocalStr);
          usuarioLocal.cambio_clave_obligatorio = false;
          localStorage.setItem('usuario', JSON.stringify(usuarioLocal));
        }

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
        await loading.dismiss();
        console.error('Error al cambiar contraseña:', err);
        const msg = err.error?.error || 'No se pudo actualizar la contraseña. Revisa la conexión.';
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