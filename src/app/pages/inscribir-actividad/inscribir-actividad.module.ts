import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { InscribirActividadPageRoutingModule } from './inscribir-actividad-routing.module';

import { InscribirActividadPage } from './inscribir-actividad.page';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { FooterComponent } from 'src/app/components/footer/footer.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    InscribirActividadPageRoutingModule,
    HeaderComponent,
    FooterComponent
  ],
  declarations: [InscribirActividadPage]
})
export class InscribirActividadPageModule {}
