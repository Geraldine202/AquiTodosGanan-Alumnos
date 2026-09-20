import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MisActividadesPage } from './mis-actividades.page';

describe('MisActividadesPage', () => {
  let component: MisActividadesPage;
  let fixture: ComponentFixture<MisActividadesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MisActividadesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
