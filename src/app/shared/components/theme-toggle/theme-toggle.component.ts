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
      [attr.aria-label]="label()"
      [title]="label()"
      (click)="themeService.alternarTema()"
    >
      <span nz-icon [nzType]="icone()" nzTheme="outline"></span>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ThemeToggleComponent {
  protected readonly themeService = inject(ThemeService);

  protected icone(): string {
    if (this.themeService.preferencia() === 'system') {
      return 'setting';
    }

    return this.themeService.tema() === 'dark' ? 'moon' : 'sun';
  }

  protected label(): string {
    const labels = {
      light: 'Tema claro',
      dark: 'Tema escuro',
      system: 'Tema do sistema'
    } as const;

    return `${labels[this.themeService.preferencia()]}. Clique para alternar.`;
  }
}
