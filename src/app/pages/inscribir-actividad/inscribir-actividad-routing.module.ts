import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { InscribirActividadPage } from './inscribir-actividad.page';

const routes: Routes = [
  {
    path: '',
    component: InscribirActividadPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class InscribirActividadPageRoutingModule {}
