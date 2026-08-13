export const PERMISSOES = {
  ADMIN: 'administrador.criar',
  ADMINISTRATIVO_CRIAR: 'administrativo.criar',
  ADMINSTRATIVO_CRIAR: 'adminstrativo.criar',
  DASHBOARD_VISUALIZAR: 'dashboard.visualizar',
  PRODUTO_LISTAR: 'produto.listar',
  PRODUTO_CRIAR: 'produto.criar',
  PRODUTO_EDITAR: 'produto.editar',
  PRODUTO_DELETAR: 'produto.deletar',
  MOVIMENTACAO_LISTAR: 'movimentacao-produto.listar',
  MOVIMENTACAO_CRIAR: 'movimentacao-produto.criar',
  CATEGORIA_LISTAR: 'categoria.listar',
  CATEGORIA_CRIAR: 'categoria.criar',
  CATEGORIA_EDITAR: 'categoria.editar',
  CATEGORIA_DELETAR: 'categoria.deletar',
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
  EMPRESA_EDITAR: 'empresa.editar',
  UNIDADE_LISTAR: 'unidade.listar',
  UNIDADE_CRIAR: 'unidade.criar',
  UNIDADE_EDITAR: 'unidade.editar',
  UNIDADE_DELETAR: 'unidade.deletar',
  HORARIO_FUNCIONAMENTO_LISTAR: 'horario-funcionamento.listar',
  HORARIO_FUNCIONAMENTO_CRIAR: 'horario-funcionamento.criar',
  HORARIO_FUNCIONAMENTO_EDITAR: 'horario-funcionamento.editar',
  HORARIO_FUNCIONAMENTO_DELETAR: 'horario-funcionamento.deletar'
} as const;

export type PermissaoAuthority = typeof PERMISSOES[keyof typeof PERMISSOES];

export const PERMISSOES_ROTAS = {
  DASHBOARD: [PERMISSOES.DASHBOARD_VISUALIZAR, PERMISSOES.ADMIN],
  PDV: [PERMISSOES.PDV_CRIAR],
  MEUS_PEDIDOS: [PERMISSOES.PEDIDO_LISTAR],
  GERENCIAR_PEDIDOS: [PERMISSOES.PEDIDO_ALTERAR_STATUS, PERMISSOES.PAGAMENTO_CONFIRMAR],
  PRODUTOS: [PERMISSOES.PRODUTO_LISTAR],
  CATEGORIAS: [PERMISSOES.CATEGORIA_LISTAR, PERMISSOES.ADMIN],
  CATEGORIA_CRIAR: [PERMISSOES.CATEGORIA_CRIAR, PERMISSOES.ADMIN],
  CATEGORIA_EDITAR: [PERMISSOES.CATEGORIA_EDITAR, PERMISSOES.ADMIN],
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
  EMPRESA: [PERMISSOES.EMPRESA_DETALHAR, PERMISSOES.EMPRESA_CRIAR, PERMISSOES.EMPRESA_EDITAR],
  UNIDADES: [PERMISSOES.UNIDADE_LISTAR, PERMISSOES.ADMIN],
  UNIDADE_CRIAR: [PERMISSOES.UNIDADE_CRIAR, PERMISSOES.ADMIN],
  UNIDADE_EDITAR: [PERMISSOES.UNIDADE_EDITAR, PERMISSOES.ADMIN],
  UNIDADE_DELETAR: [PERMISSOES.UNIDADE_DELETAR, PERMISSOES.ADMIN],
  HORARIOS_FUNCIONAMENTO: [
    PERMISSOES.HORARIO_FUNCIONAMENTO_LISTAR,
    PERMISSOES.HORARIO_FUNCIONAMENTO_CRIAR,
    PERMISSOES.HORARIO_FUNCIONAMENTO_EDITAR,
    PERMISSOES.HORARIO_FUNCIONAMENTO_DELETAR,
    PERMISSOES.ADMIN
  ],
  ADMINISTRATIVO: [
    PERMISSOES.DASHBOARD_VISUALIZAR,
    PERMISSOES.PDV_CRIAR,
    PERMISSOES.PEDIDO_ALTERAR_STATUS,
    PERMISSOES.PAGAMENTO_CONFIRMAR,
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
    PERMISSOES.HORARIO_FUNCIONAMENTO_DELETAR,
    PERMISSOES.ADMIN,
    PERMISSOES.ADMINISTRATIVO_CRIAR,
    PERMISSOES.ADMINSTRATIVO_CRIAR
  ]
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

export const ADMIN_NAV_ITEMS: readonly NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', route: '/dashboard', icon: 'appstore', exact: true, permissoes: PERMISSOES_ROTAS.DASHBOARD },
  { id: 'pdv', label: 'PDV', route: '/pdv', icon: 'credit-card', exact: true, permissoes: PERMISSOES_ROTAS.PDV },
  { id: 'gerenciar-pedidos', label: 'Gerenciar', route: '/pedidos/gerenciar', icon: 'check-circle', exact: false, permissoes: PERMISSOES_ROTAS.GERENCIAR_PEDIDOS },
  { id: 'produtos', label: 'Produtos', route: '/produtos', icon: 'shop', permissoes: PERMISSOES_ROTAS.PRODUTOS },
  { id: 'categorias', label: 'Categorias', route: '/categorias', icon: 'tags', permissoes: PERMISSOES_ROTAS.CATEGORIAS },
  { id: 'movimentacoes', label: 'Estoque', route: '/movimentacoes', icon: 'unordered-list', permissoes: PERMISSOES_ROTAS.MOVIMENTACOES },
  { id: 'usuarios', label: 'Usuarios', route: '/usuarios', icon: 'team', permissoes: PERMISSOES_ROTAS.USUARIOS },
  { id: 'perfis', label: 'Perfis', route: '/perfis', icon: 'safety-certificate', permissoes: PERMISSOES_ROTAS.PERFIS },
  { id: 'permissoes', label: 'Permissoes', route: '/permissoes', icon: 'key', permissoes: PERMISSOES_ROTAS.PERMISSOES },
  { id: 'formas-pagamento', label: 'Pagamentos', route: '/formas-pagamento', icon: 'credit-card', permissoes: PERMISSOES_ROTAS.FORMAS_PAGAMENTO },
  { id: 'configuracao-comercial', label: 'Comercial', route: '/configuracao-comercial', icon: 'setting', permissoes: PERMISSOES_ROTAS.CONFIGURACAO_COMERCIAL },
  { id: 'empresa', label: 'Empresa', route: '/empresa', icon: 'shop', permissoes: PERMISSOES_ROTAS.EMPRESA },
  { id: 'unidades', label: 'Unidades', route: '/unidades', icon: 'shop', permissoes: PERMISSOES_ROTAS.UNIDADES }
];

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'catalogo', label: 'Catalogo', route: '/catalogo', icon: 'appstore', exact: true },
  { id: 'carrinho', label: 'Carrinho', route: '/carrinho', icon: 'shopping-cart', exact: true },
  { id: 'pedidos', label: 'Pedidos', route: '/pedidos', icon: 'unordered-list', exact: true, permissoes: PERMISSOES_ROTAS.MEUS_PEDIDOS },
  { id: 'minha-conta', label: 'Perfil', route: '/minha-conta', icon: 'user', authOnly: true }
];
