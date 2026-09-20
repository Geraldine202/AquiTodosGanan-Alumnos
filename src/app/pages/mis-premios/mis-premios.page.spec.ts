import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MisPremiosPage } from './mis-premios.page';

describe('MisPremiosPage', () => {
  let component: MisPremiosPage;
  let fixture: ComponentFixture<MisPremiosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MisPremiosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
