import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MisActividadesPageRoutingModule } from './mis-actividades-routing.module';

import { MisActividadesPage } from './mis-actividades.page';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { FooterComponent } from 'src/app/components/footer/footer.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MisActividadesPageRoutingModule,
    HeaderComponent,
    FooterComponent
  ],
  declarations: [MisActividadesPage]
})
export class MisActividadesPageModule {}
