import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminActividadesPage } from './admin-actividades.page';

describe('AdminActividadesPage', () => {
  let component: AdminActividadesPage;
  let fixture: ComponentFixture<AdminActividadesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminActividadesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
