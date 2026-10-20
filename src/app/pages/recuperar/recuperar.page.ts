import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-recuperar',
  templateUrl: './recuperar.page.html',
  styleUrls: ['./recuperar.page.scss'],
  standalone: false
})
export class RecuperarPage {
  paso: number = 1;
  correo: string = '';
  token: string = '';
  
  nuevaContrasenia: string = '';
  confirmarContrasenia: string = '';

  // Visibilidad de contraseñas (ojito)
  verNuevaPassword: boolean = false;
  verConfirmarPassword: boolean = false;

  // Manejo de errores y requisitos de seguridad
  errorPassword: string = '';
  requisitosPass = {
    longitud: false,
    mayuscula: false,
    minuscula: false,
    numero: false,
    especial: false
  };

  // IP/puerto de tu servidor Node.js
  private apiUrl = 'http://localhost:3000/auth'; 

  constructor(
    private http: HttpClient,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  toggleVerNuevaPassword() {
    this.verNuevaPassword = !this.verNuevaPassword;
  }

  toggleVerConfirmarPassword() {
    this.verConfirmarPassword = !this.verConfirmarPassword;
  }

  /**
   * Evalúa la contraseña en tiempo real mientras el usuario escribe
   */
  validarPasswordEnVivo() {
    const pass = this.nuevaContrasenia || '';

    // Evaluar cada regla de seguridad
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

  /**
   * Valida la estructura completa antes de enviar la solicitud al backend
   */
  private esPasswordValida(pass: string): boolean {
    if (!pass || pass.length < 8) return false;
    const tieneMayuscula = /[A-Z]/.test(pass);
    const tieneMinuscula = /[a-z]/.test(pass);
    const tieneNumero = /\d/.test(pass);
    const tieneEspecial = /[@$!%*?&#.\-_/*+]/.test(pass);

    return tieneMayuscula && tieneMinuscula && tieneNumero && tieneEspecial;
  }

  // 1. Enviar correo para solicitar el token
  solicitarCodigo() {
    if (!this.correo || !this.correo.trim()) {
      this.mostrarToast('Por favor, ingresa tu correo institucional.', 'warning');
      return;
    }

    this.http.post<any>(`${this.apiUrl}/solicitar-recuperacion`, { correo: this.correo.trim() }).subscribe({
      next: (res) => {
        this.mostrarToast(res.mensaje || 'Código generado correctamente.', 'success');
        if (res.token) {
          console.log('🔑 Token de pruebas:', res.token);
        }
        this.paso = 2; // Avanza al paso de ingresar el código
      },
      error: (err) => {
        const msg = err.error?.error || err.error?.mensaje || 'Error al procesar la solicitud.';
        this.mostrarToast(msg, 'danger');
      }
    });
  }

  // 2. Validar token y actualizar la clave con requisitos de seguridad
  cambiarContrasenia() {
    if (!this.token || !this.nuevaContrasenia || !this.confirmarContrasenia) {
      this.mostrarToast('Por favor, completa todos los campos requeridos.', 'warning');
      return;
    }

    // Validación de reglas de complejidad
    if (!this.esPasswordValida(this.nuevaContrasenia)) {
      this.mostrarToast('La nueva contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.', 'danger');
      return;
    }

    // Validación de coincidencia
    if (this.nuevaContrasenia !== this.confirmarContrasenia) {
      this.mostrarToast('Las contraseñas ingresadas no coinciden.', 'warning');
      return;
    }

    const payload = {
      token: this.token.trim(),
      nuevaContrasenia: this.nuevaContrasenia
    };

    this.http.post<any>(`${this.apiUrl}/restablecer-password`, payload).subscribe({
      next: (res) => {
        this.mostrarToast(res.mensaje || '¡Contraseña restablecida con éxito!', 'success');
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