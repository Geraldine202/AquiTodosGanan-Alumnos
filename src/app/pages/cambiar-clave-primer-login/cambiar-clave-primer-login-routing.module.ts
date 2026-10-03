import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CambiarClavePrimerLoginPage } from './cambiar-clave-primer-login.page';

const routes: Routes = [
  {
    path: '',
    component: CambiarClavePrimerLoginPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CambiarClavePrimerLoginPageRoutingModule {}
