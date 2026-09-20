import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CanjearPage } from './canjear.page';

describe('CanjearPage', () => {
  let component: CanjearPage;
  let fixture: ComponentFixture<CanjearPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CanjearPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
