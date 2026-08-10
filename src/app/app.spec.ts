import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  AppstoreOutline,
  LoginOutline,
  MoonOutline,
  ShoppingCartOutline,
  SunOutline
} from '@ant-design/icons-angular/icons';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideNzIcons([
          AppstoreOutline,
          LoginOutline,
          MoonOutline,
          ShoppingCartOutline,
          SunOutline
        ])
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('FlashMenu');
  });
});
