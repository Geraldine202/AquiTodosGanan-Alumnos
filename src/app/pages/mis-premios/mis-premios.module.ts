import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MisPremiosPageRoutingModule } from './mis-premios-routing.module';

import { MisPremiosPage } from './mis-premios.page';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { FooterComponent } from 'src/app/components/footer/footer.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MisPremiosPageRoutingModule,
    HeaderComponent,
    FooterComponent
  ],
  declarations: [MisPremiosPage]
})
export class MisPremiosPageModule {}
