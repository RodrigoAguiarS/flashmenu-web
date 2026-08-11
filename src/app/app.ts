import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { EMPTY, catchError, filter, map, startWith } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { NAV_ITEMS, NavItem } from './core/auth/permissoes';
import { AuthService } from './core/services/auth.service';
import { CarrinhoService } from './core/services/carrinho.service';
import { ThemeToggleComponent } from './shared/components/theme-toggle/theme-toggle.component';

type RouterLinkValue = string | readonly unknown[];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NzBadgeModule,
    NzButtonModule,
    NzIconModule,
    NzLayoutModule,
    NzTooltipModule,
    ThemeToggleComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements OnInit {
  private readonly router = inject(Router);
  protected readonly authService = inject(AuthService);
  protected readonly carrinhoService = inject(CarrinhoService);
  protected readonly itensNavegacao = computed(() =>
    NAV_ITEMS.filter((item) => this.podeExibirItemNavegacao(item))
  );

  protected readonly rotaSemLayout = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.ehRotaSemLayout()),
      startWith(this.ehRotaSemLayout())
    ),
    { initialValue: false }
  );

  ngOnInit(): void {
    if (!this.authService.estaAutenticado()) {
      return;
    }

    this.authService.usuarioLogado().pipe(
      catchError(() => EMPTY)
    ).subscribe();
  }

  sair(): void {
    this.authService.sair();
  }

  protected linkCatalogo(): RouterLinkValue {
    const slug = this.carrinhoService.unidadeSlug() ?? this.authService.usuarioAutenticado()?.unidade?.slug;
    return slug ? ['/cardapio', slug] : '/catalogo';
  }

  protected linkNavegacao(item: NavItem): RouterLinkValue {
    return item.id === 'catalogo' ? this.linkCatalogo() : item.route;
  }

  private podeExibirItemNavegacao(item: NavItem): boolean {
    if (item.authOnly && !this.authService.usuarioAutenticado()) {
      return false;
    }

    if (!item.permissoes) {
      return true;
    }

    return this.authService.possuiAlgumaPermissao(item.permissoes);
  }

  private ehRotaSemLayout(): boolean {
    return this.router.url.startsWith('/login') || this.router.url.startsWith('/loja');
  }
}
