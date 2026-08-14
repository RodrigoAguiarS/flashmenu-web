import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { EMPTY, catchError, filter, map, startWith } from 'rxjs';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';

import { NAV_ITEMS, NavItem, PERMISSOES } from './core/auth/permissoes';
import { AuthService } from './core/services/auth.service';
import { CarrinhoService } from './core/services/carrinho.service';
import { NavigationHistoryService } from './core/services/navigation-history.service';
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
    NzIconModule,
    NzLayoutModule,
    ThemeToggleComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements OnInit {
  private readonly idsNavegacaoClientePublica = new Set(['catalogo', 'carrinho']);
  private readonly idsNavegacaoClienteAutenticado = new Set(['pedidos']);
  private readonly idsNavegacaoAdministrativa = new Set(['pdv', 'gerenciar-pedidos', 'administrativo']);
  private readonly router = inject(Router);
  private readonly navigationHistoryService = inject(NavigationHistoryService);
  protected readonly authService = inject(AuthService);
  protected readonly carrinhoService = inject(CarrinhoService);
  private readonly urlAtual = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );
  protected readonly portalEntregador = computed(() => this.urlAtual().startsWith('/minhas-entregas'));
  protected readonly itensNavegacao = computed(() =>
    NAV_ITEMS.filter((item) => this.podeExibirItemNavegacao(item))
  );

  protected readonly rotaSemLayout = computed(() => this.ehRotaSemLayout());

  ngOnInit(): void {
    this.navigationHistoryService.inicializar();

    if (!this.authService.estaAutenticado()) {
      return;
    }

    this.authService.usuarioLogado().pipe(
      catchError(() => EMPTY)
    ).subscribe();
  }

  protected linkLojaUnidade(): RouterLinkValue {
    const slug = this.authService.usuarioAutenticado()?.unidade?.slug ?? this.carrinhoService.unidadeSlug();
    return slug ? ['/loja', slug] : '/catalogo';
  }

  protected nomeHeader(): string {
    const unidade = this.authService.usuarioAutenticado()?.unidade;
    const slug = this.carrinhoService.unidadeSlug();

    if (unidade?.nome) {
      return unidade.nome;
    }

    if (slug) {
      return slug
        .split('-')
        .filter(Boolean)
        .map((parte) => parte[0]?.toUpperCase() + parte.slice(1))
        .join(' ');
    }

    return 'FlashMenu';
  }

  protected subtituloHeader(): string {
    const unidade = this.authService.usuarioAutenticado()?.unidade;

    if (!unidade) {
      return 'Cardapio digital';
    }

    if (unidade.abertaAgora === true) {
      if (this.portalEntregador()) {
        return 'Entregador';
      }

      return 'Aberto agora';
    }

    if (this.portalEntregador()) {
      return 'Entregador';
    }

    if (unidade.abertaAgora === false) {
      return 'Fechado agora';
    }

    return unidade.ativo ? 'Unidade ativa' : 'Unidade indisponivel';
  }

  protected logoHeader(): string | null {
    const unidade = this.authService.usuarioAutenticado()?.unidade;
    return unidade?.logoUrl ?? unidade?.imagemUrl ?? null;
  }

  protected inicialHeader(): string {
    return this.nomeHeader().trim()[0]?.toUpperCase() ?? 'F';
  }

  protected linkCatalogo(): RouterLinkValue {
    const slug = this.authService.usuarioAutenticado()?.unidade?.slug ?? this.carrinhoService.unidadeSlug();
    return slug ? ['/cardapio', slug] : '/catalogo';
  }

  protected linkNavegacao(item: NavItem): RouterLinkValue {
    return item.id === 'catalogo' ? this.linkCatalogo() : item.route;
  }

  private podeExibirItemNavegacao(item: NavItem): boolean {
    if (this.idsNavegacaoClientePublica.has(item.id) && !this.podeExibirNavegacaoClientePublica()) {
      return false;
    }

    if (this.idsNavegacaoClienteAutenticado.has(item.id) && !this.podeExibirNavegacaoClienteAutenticado()) {
      return false;
    }

    if (this.idsNavegacaoAdministrativa.has(item.id) && this.podeExibirNavegacaoClientePublica()) {
      return false;
    }

    if (item.authOnly && !this.authService.usuarioAutenticado()) {
      return false;
    }

    if (item.perfis && !this.authService.possuiAlgumPerfil(item.perfis)) {
      return false;
    }

    if (!item.permissoes) {
      return true;
    }

    return this.authService.possuiAlgumaPermissao(item.permissoes);
  }

  private podeExibirNavegacaoClientePublica(): boolean {
    return !this.authService.usuarioAutenticado() ||
      (this.authService.ehCliente() && !this.possuiAreaAdministrativa());
  }

  private podeExibirNavegacaoClienteAutenticado(): boolean {
    return !!this.authService.usuarioAutenticado() &&
      this.authService.ehCliente() &&
      !this.possuiAreaAdministrativa();
  }

  private possuiAreaAdministrativa(): boolean {
    return this.authService.possuiAlgumaPermissao([
      PERMISSOES.ADMIN,
      PERMISSOES.ADMINISTRATIVO_CRIAR,
      PERMISSOES.ADMINSTRATIVO_CRIAR,
      PERMISSOES.DASHBOARD_VISUALIZAR,
      PERMISSOES.PDV_CRIAR,
      PERMISSOES.PEDIDO_ALTERAR_STATUS,
      PERMISSOES.PAGAMENTO_CONFIRMAR,
      PERMISSOES.ENTREGA_ATRIBUIR,
      PERMISSOES.PRODUTO_LISTAR,
      PERMISSOES.CATEGORIA_LISTAR,
      PERMISSOES.MOVIMENTACAO_LISTAR,
      PERMISSOES.MOVIMENTACAO_CRIAR,
      PERMISSOES.USUARIO_LISTAR,
      PERMISSOES.PERFIL_LISTAR,
      PERMISSOES.PERMISSAO_LISTAR,
      PERMISSOES.FORMA_PAGAMENTO_EDITAR,
      PERMISSOES.CONFIGURACAO_COMERCIAL_DETALHAR,
      PERMISSOES.CONFIGURACAO_COMERCIAL_CRIAR,
      PERMISSOES.CONFIGURACAO_COMERCIAL_EDITAR,
      PERMISSOES.EMPRESA_DETALHAR,
      PERMISSOES.EMPRESA_CRIAR,
      PERMISSOES.EMPRESA_EDITAR,
      PERMISSOES.UNIDADE_LISTAR,
      PERMISSOES.HORARIO_FUNCIONAMENTO_LISTAR,
      PERMISSOES.HORARIO_FUNCIONAMENTO_CRIAR,
      PERMISSOES.HORARIO_FUNCIONAMENTO_EDITAR,
      PERMISSOES.HORARIO_FUNCIONAMENTO_DELETAR
    ]);
  }

  private ehRotaSemLayout(): boolean {
    const url = this.urlAtual();
    return url.startsWith('/login') || /^\/loja(?:\/[^/?#]+)?(?:[?#].*)?$/.test(url);
  }
}
