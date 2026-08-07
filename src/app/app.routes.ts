import { Routes } from '@angular/router';

import { Dashboard } from './pages/dashboard/dashboard';
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
    canActivate: [authGuard],
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
    data: { permissoes: ['pdv.criar'] },
    loadComponent: () => import('./pages/pdv/pdv.component').then((component) => component.PdvComponent)
  },
  {
    path: 'pedidos',
    canActivate: [authGuard],
    data: { permissoes: ['pedido.listar'] },
    loadComponent: () =>
      import('./pages/pedidos/pedido-list/pedido-list.component').then((component) => component.PedidoListComponent)
  },
  {
    path: 'pedidos/gerenciar/:id',
    canActivate: [authGuard],
    data: { permissoes: ['pedido.alterar-status', 'pagamento.confirmar', 'pedido.cancelar'] },
    loadComponent: () =>
      import('./pages/pedidos/pedido-admin-detail/pedido-admin-detail.component').then(
        (component) => component.PedidoAdminDetailComponent
      )
  },
  {
    path: 'pedidos/gerenciar',
    canActivate: [authGuard],
    data: { permissoes: ['pedido.alterar-status', 'pagamento.confirmar', 'pedido.cancelar'] },
    loadComponent: () =>
      import('./pages/pedidos/pedido-admin-list/pedido-admin-list.component').then(
        (component) => component.PedidoAdminListComponent
      )
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
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard],
    data: { permissoes: ['produto.listar'] }
  },
  {
    path: 'usuarios',
    canActivate: [authGuard],
    data: { permissoes: ['usuario.listar'] },
    loadComponent: () =>
      import('./pages/usuarios/usuario-list/usuario-list.component').then((component) => component.UsuarioListComponent)
  },
  {
    path: 'usuarios/novo',
    canActivate: [authGuard],
    data: { permissoes: ['usuario.criar'] },
    loadComponent: () =>
      import('./pages/usuarios/usuario-form/usuario-form.component').then((component) => component.UsuarioFormComponent)
  },
  {
    path: 'usuarios/:id/editar',
    canActivate: [authGuard],
    data: { permissoes: ['usuario.editar'] },
    loadComponent: () =>
      import('./pages/usuarios/usuario-form/usuario-form.component').then((component) => component.UsuarioFormComponent)
  },
  {
    path: 'perfis',
    canActivate: [authGuard],
    data: { permissoes: ['perfil.listar'] },
    loadComponent: () =>
      import('./pages/perfis/perfil-list/perfil-list.component').then((component) => component.PerfilListComponent)
  },
  {
    path: 'perfis/novo',
    canActivate: [authGuard],
    data: { permissoes: ['perfil.criar'] },
    loadComponent: () =>
      import('./pages/perfis/perfil-form/perfil-form.component').then((component) => component.PerfilFormComponent)
  },
  {
    path: 'perfis/:id/editar',
    canActivate: [authGuard],
    data: { permissoes: ['perfil.editar'] },
    loadComponent: () =>
      import('./pages/perfis/perfil-form/perfil-form.component').then((component) => component.PerfilFormComponent)
  },
  {
    path: 'permissoes',
    canActivate: [authGuard],
    data: { permissoes: ['permissao.listar'] },
    loadComponent: () =>
      import('./pages/permissoes/permissao-list/permissao-list.component').then((component) => component.PermissaoListComponent)
  },
  {
    path: 'formas-pagamento',
    canActivate: [authGuard],
    data: { permissoes: ['forma-pagamento.editar'] },
    loadComponent: () =>
      import('./pages/formas-pagamento/forma-pagamento-list/forma-pagamento-list.component').then(
        (component) => component.FormaPagamentoListComponent
      )
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
