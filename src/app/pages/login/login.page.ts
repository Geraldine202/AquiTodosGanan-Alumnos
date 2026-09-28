import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';

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
    private loadingController: LoadingController
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
        
        // 1. Guardamos obligatoriamente el RUT y el Token si vienen en la respuesta
        if (res.usuario && res.usuario.rut_usuario) {
          localStorage.setItem('rut_usuario', res.usuario.rut_usuario);
          localStorage.setItem('usuario', JSON.stringify(res.usuario)); // Guardamos el objeto completo
        }
        
        if (res.token_acceso) {
          localStorage.setItem('token_acceso', res.token_acceso);
        }

        // 2. Tu llamada normal al servicio
        this.alumnoService.guardarSesion(res.usuario);

        // 3. Redirección
        this.router.navigate(['/home']);
      },
      error: (err: any) => {
        loading.dismiss();
        console.error('Error en el login:', err);
        this.mostrarAlerta('Error de Acceso', 'Las credenciales ingresadas no coinciden con nuestros registros.');
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