import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CanjearPageRoutingModule } from './canjear-routing.module';

import { CanjearPage } from './canjear.page';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { FooterComponent } from 'src/app/components/footer/footer.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CanjearPageRoutingModule,
    HeaderComponent,
    FooterComponent
  ],
  declarations: [CanjearPage]
})
export class CanjearPageModule {}
