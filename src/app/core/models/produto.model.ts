import { CategoriaResponse } from './categoria.model';

export interface ProdutoResponse {
  id: number;
  nome: string;
  descricao: string;
  categoria: CategoriaResponse;
  valorVenda: number;
  arquivosUrl: string[];
  valorFornecedor: number;
  quantidadeEstoque: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ProdutoFiltros {
  page: number;
  size: number;
  sort?: string;
  id?: number;
  nome?: string;
  descricao?: string;
  valorFornecedor?: number;
  quantidadeEstoque?: number;
  categoriaId?: number;
}

