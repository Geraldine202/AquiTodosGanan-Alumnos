import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastController, ViewWillEnter, ViewWillLeave } from '@ionic/angular';

@Component({
  selector: 'app-recuperar',
  templateUrl: './recuperar.page.html',
  styleUrls: ['./recuperar.page.scss'],
  standalone: false
})
export class RecuperarPage implements ViewWillEnter, ViewWillLeave {
  paso: number = 1;
  correo: string = '';
  token: string = '';
  
  nuevaContrasenia: string = '';
  confirmarContrasenia: string = '';

  verNuevaPassword: boolean = false;
  verConfirmarPassword: boolean = false;

  errorPassword: string = '';
  requisitosPass = {
    longitud: false,
    mayuscula: false,
    minuscula: false,
    numero: false,
    especial: false
  };

  private apiUrl = 'http://localhost:3000/auth'; 

  constructor(
    private http: HttpClient,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  ionViewWillEnter() {
    this.resetearFormulario();
  }

  ionViewWillLeave() {
    this.resetearFormulario();
  }

  /**
   * Resetea todos los campos a su estado inicial.
   */
  resetearFormulario() {
    this.paso = 1;
    this.correo = '';
    this.token = '';
    this.nuevaContrasenia = '';
    this.confirmarContrasenia = '';
    this.verNuevaPassword = false;
    this.verConfirmarPassword = false;
    this.errorPassword = '';
    this.requisitosPass = {
      longitud: false,
      mayuscula: false,
      minuscula: false,
      numero: false,
      especial: false
    };
  }

  /**
   * Controla el botón de regreso: si está en el Paso 2, limpia todo y regresa al Paso 1.
   * Si ya está en el Paso 1, regresa a la pantalla de Login.
   */
  volverAlPaso1() {
    if (this.paso === 2) {
      this.resetearFormulario();
    } else {
      this.resetearFormulario();
      this.router.navigate(['/login']);
    }
  }

  toggleVerNuevaPassword() {
    this.verNuevaPassword = !this.verNuevaPassword;
  }

  toggleVerConfirmarPassword() {
    this.verConfirmarPassword = !this.verConfirmarPassword;
  }

  validarPasswordEnVivo() {
    const pass = this.nuevaContrasenia || '';

    this.requisitosPass.longitud = pass.length >= 8;
    this.requisitosPass.mayuscula = /[A-Z]/.test(pass);
    this.requisitosPass.minuscula = /[a-z]/.test(pass);
    this.requisitosPass.numero = /\d/.test(pass);
    this.requisitosPass.especial = /[@$!%*?&#.\-_/*+]/.test(pass);

    if (!pass) {
      this.errorPassword = '';
      return;
    }

    if (!this.requisitosPass.longitud || !this.requisitosPass.mayuscula || !this.requisitosPass.minuscula || !this.requisitosPass.numero || !this.requisitosPass.especial) {
      this.errorPassword = 'La contraseña no cumple con los requisitos mínimos de seguridad.';
    } else {
      this.errorPassword = '';
    }
  }

  private esPasswordValida(pass: string): boolean {
    if (!pass || pass.length < 8) return false;
    const tieneMayuscula = /[A-Z]/.test(pass);
    const tieneMinuscula = /[a-z]/.test(pass);
    const tieneNumero = /\d/.test(pass);
    const tieneEspecial = /[@$!%*?&#.\-_/*+]/.test(pass);

    return tieneMayuscula && tieneMinuscula && tieneNumero && tieneEspecial;
  }

  solicitarCodigo() {
    if (!this.correo || !this.correo.trim()) {
      this.mostrarToast('Por favor, ingresa tu correo institucional.', 'warning');
      return;
    }

    this.http.post<any>(`${this.apiUrl}/solicitar-recuperacion`, { correo: this.correo.trim() }).subscribe({
      next: (res) => {
        this.mostrarToast(res.mensaje || 'Código generado correctamente.', 'success');
        this.paso = 2;
      },
      error: (err) => {
        const msg = err.error?.error || err.error?.mensaje || 'Error al procesar la solicitud.';
        this.mostrarToast(msg, 'danger');
      }
    });
  }

  cambiarContrasenia() {
    if (!this.token || !this.nuevaContrasenia || !this.confirmarContrasenia) {
      this.mostrarToast('Por favor, completa todos los campos requeridos.', 'warning');
      return;
    }

    if (!this.esPasswordValida(this.nuevaContrasenia)) {
      this.mostrarToast('La nueva contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.', 'danger');
      return;
    }

    if (this.nuevaContrasenia !== this.confirmarContrasenia) {
      this.mostrarToast('Las contraseñas ingresadas no coinciden.', 'danger');
      return;
    }

    const payload = {
      token: this.token.trim(),
      nuevaContrasenia: this.nuevaContrasenia
    };

    this.http.post<any>(`${this.apiUrl}/restablecer-password`, payload).subscribe({
      next: (res) => {
        this.mostrarToast(res.mensaje || '¡Contraseña restablecida con éxito!', 'success');
        this.resetearFormulario();
        this.router.navigate(['/login']);
      },
      error: (err) => {
        const msg = err.error?.error || err.error?.mensaje || 'El código ingresado es inválido o ha expirado.';
        this.mostrarToast(msg, 'danger');
      }
    });
  }

  async mostrarToast(msj: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastCtrl.create({
      message: msj,
      duration: 3000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }
}