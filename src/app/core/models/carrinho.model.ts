import { CategoriaResponse } from './categoria.model';
import { ComplementoSelecionado } from './complemento.model';

export interface ProdutoCarrinho {
  id: number;
  nome: string;
  descricao: string;
  categoria: CategoriaResponse;
  valorVenda: number;
  imagemUrl: string | null;
  arquivosUrl: string[];
  quantidadeEstoque: number;
}

export interface ItemCarrinho {
  id: string;
  produto: ProdutoCarrinho;
  quantidade: number;
  observacao?: string | null;
  complementos?: ComplementoSelecionado[];
  valorUnitarioEstimado?: number;
}
