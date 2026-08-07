import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [NzButtonModule, NzIconModule],
  template: `
    <button
      nz-button
      nzShape="circle"
      type="button"
      [attr.aria-label]="themeService.tema() === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'"
      (click)="themeService.alternarTema()"
    >
      <span nz-icon [nzType]="themeService.tema() === 'dark' ? 'sun' : 'moon'" nzTheme="outline"></span>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ThemeToggleComponent {
  protected readonly themeService = inject(ThemeService);
}
