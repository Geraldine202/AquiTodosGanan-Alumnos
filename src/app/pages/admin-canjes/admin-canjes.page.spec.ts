import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminCanjesPage } from './admin-canjes.page';

describe('AdminCanjesPage', () => {
  let component: AdminCanjesPage;
  let fixture: ComponentFixture<AdminCanjesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminCanjesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
