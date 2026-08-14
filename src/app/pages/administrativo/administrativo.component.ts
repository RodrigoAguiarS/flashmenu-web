import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { ADMIN_NAV_ITEMS, NavItem } from '../../core/auth/permissoes';
import { AuthService } from '../../core/services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

type AdminGrupoId = 'operacao' | 'catalogo-estoque' | 'configuracoes' | 'acesso-seguranca';
type AdminDestaque = 'principal' | 'compacto';

interface AdminAtalho extends NavItem {
  descricao: string;
  destaque: AdminDestaque;
}

interface AdminGrupo {
  id: AdminGrupoId;
  titulo: string;
  descricao: string;
  itens: AdminAtalho[];
}

const ADMIN_GRUPOS: readonly Omit<AdminGrupo, 'itens'>[] = [
  {
    id: 'operacao',
    titulo: 'Operacao',
    descricao: 'Rotinas usadas no atendimento e no acompanhamento diario.'
  },
  {
    id: 'catalogo-estoque',
    titulo: 'Catalogo e estoque',
    descricao: 'Cadastro dos produtos vendidos e controle de disponibilidade.'
  },
  {
    id: 'configuracoes',
    titulo: 'Configuracoes',
    descricao: 'Parametros comerciais, pagamentos e dados da operacao.'
  },
  {
    id: 'acesso-seguranca',
    titulo: 'Acesso e seguranca',
    descricao: 'Usuarios, perfis e permissoes de uso do sistema.'
  }
];

const ADMIN_ATALHOS: Record<string, Pick<AdminAtalho, 'descricao' | 'destaque'> & { grupo: AdminGrupoId }> = {
  dashboard: {
    grupo: 'operacao',
    descricao: 'Acompanhe os principais numeros da unidade.',
    destaque: 'principal'
  },
  pdv: {
    grupo: 'operacao',
    descricao: 'Registre vendas no balcao com agilidade.',
    destaque: 'principal'
  },
  'gerenciar-pedidos': {
    grupo: 'operacao',
    descricao: 'Confirme e acompanhe os pedidos da unidade.',
    destaque: 'principal'
  },
  entregas: {
    grupo: 'operacao',
    descricao: 'Organize entregas e acompanhe o andamento.',
    destaque: 'principal'
  },
  produtos: {
    grupo: 'catalogo-estoque',
    descricao: 'Gerencie produtos, precos, imagens e estoque.',
    destaque: 'compacto'
  },
  categorias: {
    grupo: 'catalogo-estoque',
    descricao: 'Organize o cardapio por grupos de produtos.',
    destaque: 'compacto'
  },
  movimentacoes: {
    grupo: 'catalogo-estoque',
    descricao: 'Registre entradas e saidas do estoque.',
    destaque: 'compacto'
  },
  'formas-pagamento': {
    grupo: 'configuracoes',
    descricao: 'Configure os meios de pagamento aceitos.',
    destaque: 'compacto'
  },
  'configuracao-comercial': {
    grupo: 'configuracoes',
    descricao: 'Ajuste regras comerciais da unidade.',
    destaque: 'compacto'
  },
  empresa: {
    grupo: 'configuracoes',
    descricao: 'Atualize dados institucionais da empresa.',
    destaque: 'compacto'
  },
  unidades: {
    grupo: 'configuracoes',
    descricao: 'Gerencie filiais e links publicos de cardapio.',
    destaque: 'compacto'
  },
  usuarios: {
    grupo: 'acesso-seguranca',
    descricao: 'Cadastre e mantenha usuarios do sistema.',
    destaque: 'compacto'
  },
  perfis: {
    grupo: 'acesso-seguranca',
    descricao: 'Defina grupos de acesso para a equipe.',
    destaque: 'compacto'
  },
  permissoes: {
    grupo: 'acesso-seguranca',
    descricao: 'Consulte as capacidades disponiveis.',
    destaque: 'compacto'
  }
};

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

  protected readonly grupos = computed(() =>
    ADMIN_GRUPOS.map((grupo) => ({
      ...grupo,
      itens: this.atalhos().filter((atalho) => ADMIN_ATALHOS[atalho.id].grupo === grupo.id)
    })).filter((grupo) => grupo.itens.length > 0)
  );

  protected readonly possuiAtalhos = computed(() => this.grupos().length > 0);

  private readonly atalhos = computed(() =>
    ADMIN_NAV_ITEMS
      .filter((item) => this.podeExibirAtalho(item))
      .map((item) => this.mapearAtalho(item))
      .filter((item): item is AdminAtalho => item !== null)
  );

  private podeExibirAtalho(item: NavItem): boolean {
    if (!item.permissoes) {
      return true;
    }

    return this.authService.possuiAlgumaPermissao(item.permissoes);
  }

  private mapearAtalho(item: NavItem): AdminAtalho | null {
    const dados = ADMIN_ATALHOS[item.id];

    if (!dados) {
      return null;
    }

    return {
      ...item,
      descricao: dados.descricao,
      destaque: dados.destaque
    };
  }
}
