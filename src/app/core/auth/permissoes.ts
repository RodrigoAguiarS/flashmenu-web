export const PERMISSOES = {
  ADMIN: 'administrador.criar',
  DASHBOARD_VISUALIZAR: 'dashboard.visualizar',
  PRODUTO_LISTAR: 'produto.listar',
  PRODUTO_CRIAR: 'produto.criar',
  PRODUTO_EDITAR: 'produto.editar',
  PRODUTO_DELETAR: 'produto.deletar',
  MOVIMENTACAO_LISTAR: 'movimentacao-produto.listar',
  MOVIMENTACAO_CRIAR: 'movimentacao-produto.criar',
  USUARIO_LISTAR: 'usuario.listar',
  USUARIO_CRIAR: 'usuario.criar',
  USUARIO_EDITAR: 'usuario.editar',
  USUARIO_DELETAR: 'usuario.deletar',
  PERFIL_LISTAR: 'perfil.listar',
  PERFIL_CRIAR: 'perfil.criar',
  PERFIL_EDITAR: 'perfil.editar',
  PERFIL_DELETAR: 'perfil.deletar',
  PERMISSAO_LISTAR: 'permissao.listar',
  PDV_CRIAR: 'pdv.criar',
  PEDIDO_LISTAR: 'pedido.listar',
  PEDIDO_ALTERAR_STATUS: 'pedido.alterar-status',
  PEDIDO_CANCELAR: 'pedido.cancelar',
  PAGAMENTO_CONFIRMAR: 'pagamento.confirmar',
  FORMA_PAGAMENTO_EDITAR: 'forma-pagamento.editar',
  CONFIGURACAO_COMERCIAL_DETALHAR: 'configuracao-comercial.detalhar',
  CONFIGURACAO_COMERCIAL_CRIAR: 'configuracao-comercial.criar',
  CONFIGURACAO_COMERCIAL_EDITAR: 'configuracao-comercial.editar',
  EMPRESA_DETALHAR: 'empresa.detalhar',
  EMPRESA_CRIAR: 'empresa.criar',
  EMPRESA_EDITAR: 'empresa.editar'
} as const;

export type PermissaoAuthority = typeof PERMISSOES[keyof typeof PERMISSOES];

export const PERMISSOES_ROTAS = {
  DASHBOARD: [PERMISSOES.DASHBOARD_VISUALIZAR, PERMISSOES.ADMIN],
  PDV: [PERMISSOES.PDV_CRIAR],
  MEUS_PEDIDOS: [PERMISSOES.PEDIDO_LISTAR],
  GERENCIAR_PEDIDOS: [PERMISSOES.PEDIDO_ALTERAR_STATUS, PERMISSOES.PAGAMENTO_CONFIRMAR],
  PRODUTOS: [PERMISSOES.PRODUTO_LISTAR],
  PRODUTO_CRIAR: [PERMISSOES.PRODUTO_CRIAR],
  PRODUTO_EDITAR: [PERMISSOES.PRODUTO_EDITAR],
  MOVIMENTACOES: [
    PERMISSOES.MOVIMENTACAO_LISTAR,
    PERMISSOES.MOVIMENTACAO_CRIAR,
    PERMISSOES.PRODUTO_LISTAR,
    PERMISSOES.PRODUTO_EDITAR
  ],
  USUARIOS: [PERMISSOES.USUARIO_LISTAR],
  USUARIO_CRIAR: [PERMISSOES.USUARIO_CRIAR],
  USUARIO_EDITAR: [PERMISSOES.USUARIO_EDITAR],
  PERFIS: [PERMISSOES.PERFIL_LISTAR],
  PERFIL_CRIAR: [PERMISSOES.PERFIL_CRIAR],
  PERFIL_EDITAR: [PERMISSOES.PERFIL_EDITAR],
  PERMISSOES: [PERMISSOES.PERMISSAO_LISTAR],
  FORMAS_PAGAMENTO: [PERMISSOES.FORMA_PAGAMENTO_EDITAR],
  CONFIGURACAO_COMERCIAL: [
    PERMISSOES.CONFIGURACAO_COMERCIAL_DETALHAR,
    PERMISSOES.CONFIGURACAO_COMERCIAL_CRIAR,
    PERMISSOES.CONFIGURACAO_COMERCIAL_EDITAR
  ],
  EMPRESA: [PERMISSOES.EMPRESA_DETALHAR, PERMISSOES.EMPRESA_CRIAR, PERMISSOES.EMPRESA_EDITAR]
} as const satisfies Record<string, readonly PermissaoAuthority[]>;

export interface NavItem {
  id: string;
  label: string;
  route: string;
  icon: string;
  exact?: boolean;
  authOnly?: boolean;
  permissoes?: readonly PermissaoAuthority[];
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'catalogo', label: 'Catalogo', route: '/catalogo', icon: 'appstore', exact: true },
  { id: 'dashboard', label: 'Dashboard', route: '/dashboard', icon: 'appstore', exact: true, permissoes: PERMISSOES_ROTAS.DASHBOARD },
  { id: 'carrinho', label: 'Carrinho', route: '/carrinho', icon: 'shopping-cart', exact: true },
  { id: 'pdv', label: 'PDV', route: '/pdv', icon: 'credit-card', exact: true, permissoes: PERMISSOES_ROTAS.PDV },
  { id: 'pedidos', label: 'Pedidos', route: '/pedidos', icon: 'unordered-list', exact: true, permissoes: PERMISSOES_ROTAS.MEUS_PEDIDOS },
  { id: 'gerenciar-pedidos', label: 'Gerenciar', route: '/pedidos/gerenciar', icon: 'check-circle', exact: false, permissoes: PERMISSOES_ROTAS.GERENCIAR_PEDIDOS },
  { id: 'produtos', label: 'Produtos', route: '/produtos', icon: 'shop', permissoes: PERMISSOES_ROTAS.PRODUTOS },
  { id: 'movimentacoes', label: 'Estoque', route: '/movimentacoes', icon: 'unordered-list', permissoes: PERMISSOES_ROTAS.MOVIMENTACOES },
  { id: 'usuarios', label: 'Usuarios', route: '/usuarios', icon: 'team', permissoes: PERMISSOES_ROTAS.USUARIOS },
  { id: 'minha-conta', label: 'Meus dados', route: '/minha-conta', icon: 'user', authOnly: true },
  { id: 'perfis', label: 'Perfis', route: '/perfis', icon: 'safety-certificate', permissoes: PERMISSOES_ROTAS.PERFIS },
  { id: 'permissoes', label: 'Permissoes', route: '/permissoes', icon: 'key', permissoes: PERMISSOES_ROTAS.PERMISSOES },
  { id: 'formas-pagamento', label: 'Pagamentos', route: '/formas-pagamento', icon: 'credit-card', permissoes: PERMISSOES_ROTAS.FORMAS_PAGAMENTO },
  { id: 'configuracao-comercial', label: 'Comercial', route: '/configuracao-comercial', icon: 'setting', permissoes: PERMISSOES_ROTAS.CONFIGURACAO_COMERCIAL },
  { id: 'empresa', label: 'Empresa', route: '/empresa', icon: 'shop', permissoes: PERMISSOES_ROTAS.EMPRESA }
];
