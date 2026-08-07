import { registerLocaleData } from '@angular/common';
import pt from '@angular/common/locales/pt';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, LOCALE_ID, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import {
  EyeInvisibleOutline,
  EyeOutline,
  LockOutline,
  LogoutOutline,
  MailOutline,
  MoonOutline,
  SunOutline
} from '@ant-design/icons-angular/icons';
import { provideNzI18n, pt_BR } from 'ng-zorro-antd/i18n';
import { provideNzIcons } from 'ng-zorro-antd/icon';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { ThemeService } from './core/services/theme.service';

registerLocaleData(pt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    provideNzI18n(pt_BR),
    provideNzIcons([EyeInvisibleOutline, EyeOutline, LockOutline, LogoutOutline, MailOutline, MoonOutline, SunOutline]),
    provideAppInitializer(() => inject(ThemeService).inicializarTema()),
    { provide: LOCALE_ID, useValue: 'pt-BR' }
  ]
};
