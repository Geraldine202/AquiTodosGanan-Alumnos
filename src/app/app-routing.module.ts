import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadChildren: () => import('./pages/home/home.module').then( m => m.HomePageModule)
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'recuperar',
    loadChildren: () => import('./pages/recuperar/recuperar.module').then( m => m.RecuperarPageModule)
  },
  {
    path: 'perfil',
    loadChildren: () => import('./pages/perfil/perfil.module').then( m => m.PerfilPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'mis-actividades',
    loadChildren: () => import('./pages/mis-actividades/mis-actividades.module').then( m => m.MisActividadesPageModule)
  },
  {
    path: 'inscribir-actividad',
    loadChildren: () => import('./pages/inscribir-actividad/inscribir-actividad.module').then( m => m.InscribirActividadPageModule)
  },
  {
    path: 'inscribir-actividad/:id', // <--- ESTA ES LA QUE RECIBE EL ID DE LA ACTIVIDAD
    loadChildren: () => import('./pages/inscribir-actividad/inscribir-actividad.module').then( m => m.InscribirActividadPageModule)
  },
  {
    path: 'canjear',
    loadChildren: () => import('./pages/canjear/canjear.module').then( m => m.CanjearPageModule)
  },
  {
    path: 'mis-premios',
    loadChildren: () => import('./pages/mis-premios/mis-premios.module').then( m => m.MisPremiosPageModule)
  },  {
    path: 'cambiar-clave-primer-login',
    loadChildren: () => import('./pages/cambiar-clave-primer-login/cambiar-clave-primer-login.module').then( m => m.CambiarClavePrimerLoginPageModule)
  }







];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
