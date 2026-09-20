import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MisPremiosPage } from './mis-premios.page';

const routes: Routes = [
  {
    path: '',
    component: MisPremiosPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MisPremiosPageRoutingModule {}
