import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CambiarClavePrimerLoginPageRoutingModule } from './cambiar-clave-primer-login-routing.module';

import { CambiarClavePrimerLoginPage } from './cambiar-clave-primer-login.page';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { FooterComponent } from 'src/app/components/footer/footer.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CambiarClavePrimerLoginPageRoutingModule,
    HeaderComponent,
    FooterComponent
  ],
  declarations: [CambiarClavePrimerLoginPage]
})
export class CambiarClavePrimerLoginPageModule {}
