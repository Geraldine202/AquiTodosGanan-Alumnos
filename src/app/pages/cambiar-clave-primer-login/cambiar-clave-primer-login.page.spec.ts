import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CambiarClavePrimerLoginPage } from './cambiar-clave-primer-login.page';

describe('CambiarClavePrimerLoginPage', () => {
  let component: CambiarClavePrimerLoginPage;
  let fixture: ComponentFixture<CambiarClavePrimerLoginPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CambiarClavePrimerLoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
