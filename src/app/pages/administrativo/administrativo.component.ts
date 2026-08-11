import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { ADMIN_NAV_ITEMS, NavItem } from '../../core/auth/permissoes';
import { AuthService } from '../../core/services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-administrativo',
  standalone: true,
  imports: [
    RouterLink,
    NzEmptyModule,
    NzIconModule,
    PageHeaderComponent
  ],
  templateUrl: './administrativo.component.html',
  styleUrl: './administrativo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdministrativoComponent {
  private readonly authService = inject(AuthService);

  protected readonly atalhos = computed(() =>
    ADMIN_NAV_ITEMS.filter((item) => this.podeExibirAtalho(item))
  );

  private podeExibirAtalho(item: NavItem): boolean {
    if (!item.permissoes) {
      return true;
    }

    return this.authService.possuiAlgumaPermissao(item.permissoes);
  }
}
