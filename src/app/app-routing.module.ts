import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
// Reemplaza la ruta del guard para importarlo desde tu servicio Auth
import { authGuard } from './services/auth'; 

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'home',
    loadChildren: () => import('./pages/home/home.module').then( m => m.HomePageModule),
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
    loadChildren: () => import('./pages/mis-actividades/mis-actividades.module').then( m => m.MisActividadesPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'inscribir-actividad',
    loadChildren: () => import('./pages/inscribir-actividad/inscribir-actividad.module').then( m => m.InscribirActividadPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'inscribir-actividad/:id',
    loadChildren: () => import('./pages/inscribir-actividad/inscribir-actividad.module').then( m => m.InscribirActividadPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'canjear',
    loadChildren: () => import('./pages/canjear/canjear.module').then( m => m.CanjearPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'mis-premios',
    loadChildren: () => import('./pages/mis-premios/mis-premios.module').then( m => m.MisPremiosPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'cambiar-clave-primer-login',
    loadChildren: () => import('./pages/cambiar-clave-primer-login/cambiar-clave-primer-login.module').then( m => m.CambiarClavePrimerLoginPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'admin-actividades',
    loadChildren: () => import('./pages/admin-actividades/admin-actividades.module').then( m => m.AdminActividadesPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'admin-canjes',
    loadChildren: () => import('./pages/admin-canjes/admin-canjes.module').then( m => m.AdminCanjesPageModule),
    canActivate: [authGuard]
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}