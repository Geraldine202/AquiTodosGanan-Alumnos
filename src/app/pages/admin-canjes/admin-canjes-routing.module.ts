import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminCanjesPage } from './admin-canjes.page';

const routes: Routes = [
  {
    path: '',
    component: AdminCanjesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminCanjesPageRoutingModule {}
