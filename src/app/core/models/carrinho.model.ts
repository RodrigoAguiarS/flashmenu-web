import { CategoriaResponse } from './categoria.model';

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
}
