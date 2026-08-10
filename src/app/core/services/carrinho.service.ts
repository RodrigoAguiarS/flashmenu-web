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

  adicionar(produto: ProdutoResponse, quantidade = 1, observacao?: string | null): boolean {
    const quantidadeNormalizada = Math.max(1, Math.trunc(quantidade));
    const observacaoNormalizada = this.normalizarObservacao(observacao);
    const itemId = this.criarItemId(produto.id, observacaoNormalizada);
    const itens = this.itensCarrinho();
    const itemExistente = itens.find((item) => item.id === itemId);
    const quantidadeAtual = itemExistente?.quantidade ?? 0;
    const novaQuantidade = quantidadeAtual + quantidadeNormalizada;

    if (!this.quantidadePermitida(produto, novaQuantidade, itemId)) {
      return false;
    }

    const proximosItens = itemExistente
      ? itens.map((item) => item.id === itemId ? { ...item, quantidade: novaQuantidade } : item)
      : [...itens, {
        id: itemId,
        produto: this.paraProdutoCarrinho(produto),
        quantidade: quantidadeNormalizada,
        observacao: observacaoNormalizada
      }];

    this.atualizarItens(proximosItens);
    return true;
  }

  definirQuantidade(itemId: string, quantidade: number): boolean {
    const quantidadeNormalizada = Math.max(1, Math.trunc(quantidade));
    const item = this.itensCarrinho().find((itemCarrinho) => itemCarrinho.id === itemId);

    if (!item || !this.quantidadePermitida(item.produto, quantidadeNormalizada, itemId)) {
      return false;
    }

    this.atualizarItens(
      this.itensCarrinho().map((itemCarrinho) =>
        itemCarrinho.id === itemId ? { ...itemCarrinho, quantidade: quantidadeNormalizada } : itemCarrinho
      )
    );
    return true;
  }

  incrementar(itemId: string): boolean {
    const item = this.itensCarrinho().find((itemCarrinho) => itemCarrinho.id === itemId);
    return item ? this.definirQuantidade(itemId, item.quantidade + 1) : false;
  }

  decrementar(itemId: string): boolean {
    const item = this.itensCarrinho().find((itemCarrinho) => itemCarrinho.id === itemId);

    if (!item || item.quantidade <= 1) {
      return false;
    }

    return this.definirQuantidade(itemId, item.quantidade - 1);
  }

  remover(itemId: string): void {
    this.atualizarItens(this.itensCarrinho().filter((item) => item.id !== itemId));
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

  private quantidadePermitida(produto: ProdutoCarrinho | ProdutoResponse, quantidade: number, itemIdAtual?: string): boolean {
    const estoque = this.quantidadeDisponivel(produto);

    if (estoque === null) {
      return true;
    }

    const quantidadeOutrosItens = this.itensCarrinho()
      .filter((item) => item.produto.id === produto.id && item.id !== itemIdAtual)
      .reduce((total, item) => total + item.quantidade, 0);

    return quantidadeOutrosItens + quantidade <= estoque;
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
              id: this.criarItemId(item.produto.id, this.normalizarObservacao(item.observacao)),
              produto: this.paraProdutoCarrinho(item.produto as ProdutoResponse),
              quantidade: item.quantidade,
              observacao: this.normalizarObservacao(item.observacao)
            }))
        : [];

      localStorage.setItem(CARRINHO_KEY, JSON.stringify(itensNormalizados));
      return itensNormalizados;
    } catch {
      localStorage.removeItem(CARRINHO_KEY);
      return [];
    }
  }

  private normalizarObservacao(observacao: string | null | undefined): string | null {
    const valor = observacao?.trim();
    return valor ? valor.substring(0, 255) : null;
  }

  private criarItemId(produtoId: number, observacao: string | null): string {
    return `${produtoId}:${observacao ?? ''}`;
  }
}
