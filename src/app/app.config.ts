import { registerLocaleData } from '@angular/common';
import pt from '@angular/common/locales/pt';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, LOCALE_ID, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  AppstoreOutline,
  ArrowLeftOutline,
  ArrowRightOutline,
  CarOutline,
  CheckCircleOutline,
  ClockCircleOutline,
  CloseCircleOutline,
  CreditCardOutline,
  DeleteOutline,
  DollarOutline,
  EditOutline,
  EnvironmentOutline,
  ExportOutline,
  EyeInvisibleOutline,
  EyeOutline,
  FilePdfOutline,
  FilterOutline,
  HomeOutline,
  KeyOutline,
  LoginOutline,
  LockOutline,
  LogoutOutline,
  MailOutline,
  MoonOutline,
  MinusOutline,
  PauseCircleOutline,
  PictureOutline,
  PlayCircleOutline,
  PlusOutline,
  PhoneOutline,
  ReloadOutline,
  SafetyCertificateOutline,
  SaveOutline,
  SearchOutline,
  SettingOutline,
  ShareAltOutline,
  ShopOutline,
  ShoppingCartOutline,
  SunOutline,
  TagsOutline,
  TeamOutline,
  ThunderboltOutline,
  UnorderedListOutline,
  UploadOutline,
  UserOutline,
  UserAddOutline,
  WhatsAppOutline
} from '@ant-design/icons-angular/icons';
import { provideNzNativeDateAdapter } from 'ng-zorro-antd/core/time';
import { provideNzI18n, pt_BR } from 'ng-zorro-antd/i18n';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { provideEnvironmentNgxMask } from 'ngx-mask';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { ThemeService } from './core/services/theme.service';

registerLocaleData(pt);

const ptBRComQRCode = {
  ...pt_BR,
  QRCode: {
    expired: 'QR Code expirado',
    refresh: 'Atualizar',
    scanned: 'Escaneado'
  }
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideNzI18n(ptBRComQRCode),
    provideNzNativeDateAdapter({ locale: 'pt-BR', firstDayOfWeek: 1 }),
    provideEnvironmentNgxMask({ validation: false }),
    provideNzIcons([
      AppstoreOutline,
      ArrowLeftOutline,
      ArrowRightOutline,
      CarOutline,
      CheckCircleOutline,
      ClockCircleOutline,
      CloseCircleOutline,
      CreditCardOutline,
      DeleteOutline,
      DollarOutline,
      EditOutline,
      EnvironmentOutline,
      ExportOutline,
      EyeInvisibleOutline,
      EyeOutline,
      FilePdfOutline,
      FilterOutline,
      HomeOutline,
      KeyOutline,
      LoginOutline,
      LockOutline,
      LogoutOutline,
      MailOutline,
      MoonOutline,
      MinusOutline,
      PauseCircleOutline,
      PictureOutline,
      PlayCircleOutline,
      PlusOutline,
      PhoneOutline,
      ReloadOutline,
      SafetyCertificateOutline,
      SaveOutline,
      SearchOutline,
      SettingOutline,
      ShareAltOutline,
      ShopOutline,
      ShoppingCartOutline,
      SunOutline,
      TagsOutline,
      TeamOutline,
      ThunderboltOutline,
      UnorderedListOutline,
      UploadOutline,
      UserOutline,
      UserAddOutline,
      WhatsAppOutline
    ]),
    provideAppInitializer(() => inject(ThemeService).inicializarTema()),
    { provide: LOCALE_ID, useValue: 'pt-BR' }
  ]
};
