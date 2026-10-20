import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminCanjesPageRoutingModule } from './admin-canjes-routing.module';

import { AdminCanjesPage } from './admin-canjes.page';
import { FooterComponent } from 'src/app/components/footer/footer.component';
import { HeaderComponent } from 'src/app/components/header/header.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminCanjesPageRoutingModule,
    FooterComponent,
    HeaderComponent,
  ],
  declarations: [AdminCanjesPage]
})
export class AdminCanjesPageModule {}
