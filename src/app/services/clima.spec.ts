import { TestBed } from '@angular/core/testing';

import { Clima } from './clima';

describe('Clima', () => {
  let service: Clima;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Clima);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
