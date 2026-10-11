import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminActividadesPageRoutingModule } from './admin-actividades-routing.module';

import { AdminActividadesPage } from './admin-actividades.page';
import { FooterComponent } from 'src/app/components/footer/footer.component';
import { HeaderComponent } from 'src/app/components/header/header.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminActividadesPageRoutingModule,
      HeaderComponent,
        FooterComponent
  ],
  declarations: [AdminActividadesPage]
})
export class AdminActividadesPageModule {}
