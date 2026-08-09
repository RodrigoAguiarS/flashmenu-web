import { Routes } from '@angular/router';

import { PERMISSOES_ROTAS } from './core/auth/permissoes';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then((component) => component.LoginComponent)
  },
  {
    path: 'catalogo',
    loadComponent: () => import('./pages/catalogo/catalogo.component').then((component) => component.CatalogoComponent)
  },
  {
    path: 'carrinho',
    loadComponent: () => import('./pages/carrinho/carrinho.component').then((component) => component.CarrinhoComponent)
  },
  {
    path: 'checkout',
    loadComponent: () => import('./pages/checkout/checkout.component').then((component) => component.CheckoutComponent)
  },
  {
    path: 'pedido/sucesso',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/pedido-sucesso/pedido-sucesso.component').then((component) => component.PedidoSucessoComponent)
  },
  {
    path: 'pdv',
    canActivate: [authGuard],
    data: { permissoes: PERMISSOES_ROTAS.PDV },
    loadComponent: () => import('./pages/pdv/pdv.component').then((component) => component.PdvComponent)
  },
  {
    path: 'pedidos',
    canActivate: [authGuard],
    data: { permissoes: PERMISSOES_ROTAS.MEUS_PEDIDOS },
    loadComponent: () =>
      import('./pages/pedidos/pedido-list/pedido-list.component').then((component) => component.PedidoListComponent)
  },
  {
    path: 'pedidos/gerenciar/:id',
    canActivate: [authGuard],
    data: { permissoes: PERMISSOES_ROTAS.GERENCIAR_PEDIDOS },
    loadComponent: () =>
      import('./pages/pedidos/pedido-admin-detail/pedido-admin-detail.component').then(
        (component) => component.PedidoAdminDetailComponent
      )
  },
  {
    path: 'pedidos/gerenciar',
    canActivate: [authGuard],
    data: { permissoes: PERMISSOES_ROTAS.GERENCIAR_PEDIDOS },
    loadComponent: () =>
      import('./pages/pedidos/pedido-admin-list/pedido-admin-list.component').then(
        (component) => component.PedidoAdminListComponent
      )
  },
  {
    path: 'pedidos/:id',
    canActivate: [authGuard],
    data: { permissoes: PERMISSOES_ROTAS.MEUS_PEDIDOS },
    loadComponent: () =>
      import('./pages/pedidos/pedido-detail/pedido-detail.component').then((component) => component.PedidoDetailComponent)
  },
  {
    path: 'minha-conta',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/minha-conta/minha-conta-form/minha-conta-form.component').then(
        (component) => component.MinhaContaFormComponent
      )
  },
  {
    path: 'produtos',
    canActivate: [authGuard],
    data: { permissoes: PERMISSOES_ROTAS.PRODUTOS },
    loadComponent: () =>
      import('./pages/produtos/produto-list/produto-list.component').then((component) => component.ProdutoListComponent)
  },
  {
    path: 'produtos/novo',
    canActivate: [authGuard],
    data: { permissoes: PERMISSOES_ROTAS.PRODUTO_CRIAR },
    loadComponent: () =>
      import('./pages/produtos/produto-form/produto-form.component').then((component) => component.ProdutoFormComponent)
  },
  {
    path: 'produtos/:id/editar',
    canActivate: [authGuard],
    data: { permissoes: PERMISSOES_ROTAS.PRODUTO_EDITAR },
    loadComponent: () =>
      import('./pages/produtos/produto-form/produto-form.component').then((component) => component.ProdutoFormComponent)
  },
  {
    path: 'movimentacoes',
    canActivate: [authGuard],
    data: { permissoes: PERMISSOES_ROTAS.MOVIMENTACOES },
    loadComponent: () =>
      import('./pages/movimentacoes-produto/movimentacoes-produto.component').then(
        (component) => component.MovimentacoesProdutoComponent
      )
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    data: { permissoes: PERMISSOES_ROTAS.DASHBOARD },
    loadComponent: () => import('./pages/dashboard/dashboard').then((component) => component.Dashboard)
  },
  {
    path: 'usuarios',
    canActivate: [authGuard],
    data: { permissoes: PERMISSOES_ROTAS.USUARIOS },
    loadComponent: () =>
      import('./pages/usuarios/usuario-list/usuario-list.component').then((component) => component.UsuarioListComponent)
  },
  {
    path: 'usuarios/novo',
    canActivate: [authGuard],
    data: { permissoes: PERMISSOES_ROTAS.USUARIO_CRIAR },
    loadComponent: () =>
      import('./pages/usuarios/usuario-form/usuario-form.component').then((component) => component.UsuarioFormComponent)
  },
  {
    path: 'usuarios/:id/editar',
    canActivate: [authGuard],
    data: { permissoes: PERMISSOES_ROTAS.USUARIO_EDITAR },
    loadComponent: () =>
      import('./pages/usuarios/usuario-form/usuario-form.component').then((component) => component.UsuarioFormComponent)
  },
  {
    path: 'usuarios/:usuarioId/enderecos',
    canActivate: [authGuard],
    data: { permissoes: PERMISSOES_ROTAS.USUARIOS },
    loadComponent: () =>
      import('./pages/usuarios/usuario-endereco/usuario-endereco.component').then(
        (component) => component.UsuarioEnderecoComponent
      )
  },
  {
    path: 'perfis',
    canActivate: [authGuard],
    data: { permissoes: PERMISSOES_ROTAS.PERFIS },
    loadComponent: () =>
      import('./pages/perfis/perfil-list/perfil-list.component').then((component) => component.PerfilListComponent)
  },
  {
    path: 'perfis/novo',
    canActivate: [authGuard],
    data: { permissoes: PERMISSOES_ROTAS.PERFIL_CRIAR },
    loadComponent: () =>
      import('./pages/perfis/perfil-form/perfil-form.component').then((component) => component.PerfilFormComponent)
  },
  {
    path: 'perfis/:id/editar',
    canActivate: [authGuard],
    data: { permissoes: PERMISSOES_ROTAS.PERFIL_EDITAR },
    loadComponent: () =>
      import('./pages/perfis/perfil-form/perfil-form.component').then((component) => component.PerfilFormComponent)
  },
  {
    path: 'permissoes',
    canActivate: [authGuard],
    data: { permissoes: PERMISSOES_ROTAS.PERMISSOES },
    loadComponent: () =>
      import('./pages/permissoes/permissao-list/permissao-list.component').then((component) => component.PermissaoListComponent)
  },
  {
    path: 'formas-pagamento',
    canActivate: [authGuard],
    data: { permissoes: PERMISSOES_ROTAS.FORMAS_PAGAMENTO },
    loadComponent: () =>
      import('./pages/formas-pagamento/forma-pagamento-list/forma-pagamento-list.component').then(
        (component) => component.FormaPagamentoListComponent
      )
  },
  {
    path: 'configuracao-comercial',
    canActivate: [authGuard],
    data: { permissoes: PERMISSOES_ROTAS.CONFIGURACAO_COMERCIAL },
    loadComponent: () =>
      import('./pages/configuracao-comercial/configuracao-comercial.component').then(
        (component) => component.ConfiguracaoComercialComponent
      )
  },
  {
    path: 'empresa',
    canActivate: [authGuard],
    data: { permissoes: PERMISSOES_ROTAS.EMPRESA },
    loadComponent: () => import('./pages/empresa/empresa.component').then((component) => component.EmpresaComponent)
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'catalogo'
  },
  {
    path: '**',
    redirectTo: 'catalogo'
  }
];
