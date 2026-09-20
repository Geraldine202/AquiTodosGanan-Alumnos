import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CanjearPage } from './canjear.page';

const routes: Routes = [
  {
    path: '',
    component: CanjearPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CanjearPageRoutingModule {}
