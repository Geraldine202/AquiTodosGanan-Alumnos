import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, NavController } from '@ionic/angular';

import { AlumnoService } from '../../services/alumno'; 

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

  constructor(
    private alumnoService: AlumnoService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private navCtrl: NavController
  ) { }

  ngOnInit() {
  }

  toggleMostrarPassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  async iniciarSesion() {
    if (!this.credenciales.correo.trim() || !this.credenciales.password.trim()) {
      this.mostrarAlerta('Campos Vacíos', 'Por favor, ingresa tu correo institucional y contraseña.');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Autenticando usuario...',
      spinner: 'crescent'
    });
    await loading.present();

  this.alumnoService.login(this.credenciales).subscribe({
  next: (res: any) => {
    loading.dismiss();
    
    if (res.usuario && res.usuario.rut_usuario) {
      localStorage.setItem('rut_usuario', res.usuario.rut_usuario);
      localStorage.setItem('usuario', JSON.stringify(res.usuario));
    }
    
    if (res.token_acceso) {
      localStorage.setItem('token_acceso', res.token_acceso);
    }

    this.alumnoService.guardarSesion(res.usuario);

    // VERIFICAR SI DEBE CAMBIAR SU CONTRASEÑA POR PRIMERA VEZ
    if (res.usuario.cambio_clave_obligatorio) {
      // Redirigir a la página donde cambiará la clave
      this.navCtrl.navigateRoot('/cambiar-clave-primer-login');
    } else {
      // Flujo normal hacia Home
      this.navCtrl.navigateRoot('/home');
    }
  },
  error: (err: any) => {
    loading.dismiss();
    const mensajeError = err.error?.error || 'Las credenciales ingresadas no coinciden.';
    this.mostrarAlerta('Error de Acceso', mensajeError);
  }
});
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