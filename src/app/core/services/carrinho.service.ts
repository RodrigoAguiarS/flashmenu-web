import { Injectable, Signal, computed, signal } from '@angular/core';

import { ItemCarrinho, ProdutoCarrinho } from '../models/carrinho.model';
import { ProdutoResponse } from '../models/produto.model';

const CARRINHO_KEY = 'flashmenu_carrinho';

@Injectable({
  providedIn: 'root'
})
export class CarrinhoService {
  private readonly itensCarrinho = signal<ItemCarrinho[]>(this.carregarCarrinho());

  readonly itens: Signal<ItemCarrinho[]> = computed(() => this.itensCarrinho());
  readonly quantidadeTotal = computed(() => this.itensCarrinho().reduce((total, item) => total + item.quantidade, 0));
  readonly valorTotal = computed(() =>
    this.itensCarrinho().reduce((total, item) => total + this.obterPreco(item.produto) * item.quantidade, 0)
  );
  readonly vazio = computed(() => this.itensCarrinho().length === 0);

  adicionar(produto: ProdutoResponse, quantidade = 1): boolean {
    const quantidadeNormalizada = Math.max(1, Math.trunc(quantidade));
    const itens = this.itensCarrinho();
    const itemExistente = itens.find((item) => item.produto.id === produto.id);
    const quantidadeAtual = itemExistente?.quantidade ?? 0;
    const novaQuantidade = quantidadeAtual + quantidadeNormalizada;

    if (!this.quantidadePermitida(produto, novaQuantidade)) {
      return false;
    }

    const proximosItens = itemExistente
      ? itens.map((item) => item.produto.id === produto.id ? { ...item, quantidade: novaQuantidade } : item)
      : [...itens, { produto: this.paraProdutoCarrinho(produto), quantidade: quantidadeNormalizada }];

    this.atualizarItens(proximosItens);
    return true;
  }

  definirQuantidade(produtoId: number, quantidade: number): boolean {
    const quantidadeNormalizada = Math.max(1, Math.trunc(quantidade));
    const item = this.itensCarrinho().find((itemCarrinho) => itemCarrinho.produto.id === produtoId);

    if (!item || !this.quantidadePermitida(item.produto, quantidadeNormalizada)) {
      return false;
    }

    this.atualizarItens(
      this.itensCarrinho().map((itemCarrinho) =>
        itemCarrinho.produto.id === produtoId ? { ...itemCarrinho, quantidade: quantidadeNormalizada } : itemCarrinho
      )
    );
    return true;
  }

  incrementar(produtoId: number): boolean {
    const item = this.itensCarrinho().find((itemCarrinho) => itemCarrinho.produto.id === produtoId);
    return item ? this.definirQuantidade(produtoId, item.quantidade + 1) : false;
  }

  decrementar(produtoId: number): boolean {
    const item = this.itensCarrinho().find((itemCarrinho) => itemCarrinho.produto.id === produtoId);

    if (!item || item.quantidade <= 1) {
      return false;
    }

    return this.definirQuantidade(produtoId, item.quantidade - 1);
  }

  remover(produtoId: number): void {
    this.atualizarItens(this.itensCarrinho().filter((item) => item.produto.id !== produtoId));
  }

  limpar(): void {
    this.atualizarItens([]);
  }

  quantidadeDisponivel(produto: ProdutoCarrinho | ProdutoResponse): number | null {
    return Number.isFinite(produto.quantidadeEstoque) ? produto.quantidadeEstoque : null;
  }

  possuiEstoque(produto: ProdutoCarrinho | ProdutoResponse): boolean {
    const estoque = this.quantidadeDisponivel(produto);
    return estoque === null || estoque > 0;
  }

  obterPreco(produto: ProdutoCarrinho | ProdutoResponse): number {
    return Number(produto.valorVenda ?? 0);
  }

  private quantidadePermitida(produto: ProdutoCarrinho | ProdutoResponse, quantidade: number): boolean {
    const estoque = this.quantidadeDisponivel(produto);
    return estoque === null || quantidade <= estoque;
  }

  private paraProdutoCarrinho(produto: ProdutoResponse): ProdutoCarrinho {
    return {
      id: produto.id,
      nome: produto.nome,
      descricao: produto.descricao,
      categoria: produto.categoria,
      valorVenda: produto.valorVenda,
      imagemUrl: produto.imagemUrl,
      arquivosUrl: produto.arquivosUrl,
      quantidadeEstoque: produto.quantidadeEstoque
    };
  }

  private atualizarItens(itens: ItemCarrinho[]): void {
    this.itensCarrinho.set(itens);
    localStorage.setItem(CARRINHO_KEY, JSON.stringify(itens));
  }

  private carregarCarrinho(): ItemCarrinho[] {
    const carrinho = localStorage.getItem(CARRINHO_KEY);

    if (!carrinho) {
      return [];
    }

    try {
      const itens = JSON.parse(carrinho) as ItemCarrinho[];
      const itensNormalizados = Array.isArray(itens)
        ? itens
            .filter((item) => item?.produto?.id && item.quantidade > 0)
            .map((item) => ({
              produto: this.paraProdutoCarrinho(item.produto as ProdutoResponse),
              quantidade: item.quantidade
            }))
        : [];

      localStorage.setItem(CARRINHO_KEY, JSON.stringify(itensNormalizados));
      return itensNormalizados;
    } catch {
      localStorage.removeItem(CARRINHO_KEY);
      return [];
    }
  }
}
