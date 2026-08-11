import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { NavigationHistoryService } from '../../../core/services/navigation-history.service';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [NzButtonModule, NzIconModule, NzTooltipModule],
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageHeaderComponent {
  private readonly navigationHistoryService = inject(NavigationHistoryService);

  readonly titulo = input.required<string>();
  readonly descricao = input<string | null>(null);
  readonly exibirVoltar = input(true);
  protected readonly mostrarVoltar = computed(() => this.exibirVoltar() && this.navigationHistoryService.podeVoltar());

  protected voltar(): void {
    this.navigationHistoryService.voltar();
  }
}
