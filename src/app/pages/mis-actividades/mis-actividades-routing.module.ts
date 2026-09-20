import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MisActividadesPage } from './mis-actividades.page';

const routes: Routes = [
  {
    path: '',
    component: MisActividadesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MisActividadesPageRoutingModule {}
