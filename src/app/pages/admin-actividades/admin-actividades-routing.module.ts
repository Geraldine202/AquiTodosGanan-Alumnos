import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminActividadesPage } from './admin-actividades.page';

const routes: Routes = [
  {
    path: '',
    component: AdminActividadesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminActividadesPageRoutingModule {}
