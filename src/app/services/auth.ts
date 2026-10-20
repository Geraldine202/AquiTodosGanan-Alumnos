import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class Auth {

  constructor() {}

  /**
   * Obtiene la sesión o datos del usuario actual.
   */
  getUsuario(): any | null {
    const sessionData = localStorage.getItem('usuario') || 
                        sessionStorage.getItem('usuario') || 
                        localStorage.getItem('usuarioLogueado') ||
                        localStorage.getItem('session');

    if (!sessionData) return null;

    try {
      return typeof sessionData === 'string' && sessionData.trim().startsWith('{')
        ? JSON.parse(sessionData)
        : { rut_usuario: sessionData };
    } catch (e) {
      return { rut_usuario: sessionData };
    }
  }

  /**
   * Retorna el id_tipo_usuario numérico.
   */
  getTipoUsuario(): number {
    const usuario = this.getUsuario();
    if (!usuario) return 0;

    return Number(
      usuario?.id_tipo_usuario ?? 
      usuario?.tipo_usuario?.id_tipo_usuario ?? 
      usuario?.id_rol ?? 
      1
    );
  }

  /**
   * Valida si el usuario posee rol Admin (2), Consejero (3) o Tipo 4.
   */
  esAdminOConsejero(): boolean {
    const tipo = this.getTipoUsuario();
    return [2, 3, 4].includes(tipo);
  }

  /**
   * Retorna true si hay un usuario logueado en sesión.
   */
  estaAutenticado(): boolean {
    return this.getUsuario() !== null;
  }
}

/**
 * Guarda de rutas que puedes importar directamente en AppRoutingModule.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);

  // 1. Verificar si está autenticado
  if (!authService.estaAutenticado()) {
    router.navigate(['/login']);
    return false;
  }

  // 2. Verificar permisos para rutas de administración
  const url = state.url;
  const esRutaAdmin = url.includes('admin-actividades') || url.includes('admin-canjes');

  if (esRutaAdmin && !authService.esAdminOConsejero()) {
    router.navigate(['/home']);
    return false;
  }

  return true;
};