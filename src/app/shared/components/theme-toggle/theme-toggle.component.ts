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
      class="theme-toggle"
      nz-button
      nzShape="circle"
      type="button"
      [class.theme-toggle--light]="themeService.preferencia() === 'light'"
      [class.theme-toggle--dark]="themeService.preferencia() === 'dark'"
      [class.theme-toggle--system]="themeService.preferencia() === 'system'"
      [attr.aria-label]="label()"
      [title]="label()"
      (click)="themeService.alternarTema()"
    >
      <span nz-icon [nzType]="icone()" nzTheme="outline"></span>
    </button>
  `,
  styles: [`
    .theme-toggle {
      display: inline-grid;
      place-items: center;
      width: 36px;
      min-width: 36px;
      height: 36px;
      padding: 0;
      border-radius: 999px;
      transition:
        background-color 160ms ease,
        border-color 160ms ease,
        color 160ms ease;
    }

    .theme-toggle--light {
      color: #b45309;
      background: #fffbeb;
      border-color: #fcd34d;
    }

    .theme-toggle--dark {
      color: #bfdbfe;
      background: #172554;
      border-color: #3b82f6;
    }

    .theme-toggle--system {
      color: #0f766e;
      background: color-mix(in srgb, #14b8a6 14%, var(--cor-superficie));
      border-color: #14b8a6;
    }

    :host-context(.theme-dark) .theme-toggle--system {
      color: #5eead4;
      background: color-mix(in srgb, #14b8a6 18%, var(--cor-superficie));
      border-color: #2dd4bf;
    }

    .theme-toggle:hover,
    .theme-toggle:focus-visible {
      color: var(--cor-primaria);
      border-color: var(--cor-primaria);
    }
  `],
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
