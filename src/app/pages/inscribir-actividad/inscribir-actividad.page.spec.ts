import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InscribirActividadPage } from './inscribir-actividad.page';

describe('InscribirActividadPage', () => {
  let component: InscribirActividadPage;
  let fixture: ComponentFixture<InscribirActividadPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(InscribirActividadPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
