import { Injectable, Signal, computed, signal } from '@angular/core';

import { ComplementoSelecionado } from '../models/complemento.model';
import { ItemCarrinho, ProdutoCarrinho } from '../models/carrinho.model';
import { ProdutoResponse } from '../models/produto.model';
import { chaveComplementos } from '../utils/complemento-config.util';

const PDV_KEY = 'flashmenu_pdv_venda';

@Injectable({
  providedIn: 'root'
})
export class PdvService {
  private readonly itensVenda = signal<ItemCarrinho[]>(this.carregarVenda());

  readonly itens: Signal<ItemCarrinho[]> = computed(() => this.itensVenda());
  readonly quantidadeTotal = computed(() => this.itensVenda().reduce((total, item) => total + item.quantidade, 0));
  readonly valorTotal = computed(() =>
    this.itensVenda().reduce((total, item) => total + this.obterPrecoItem(item) * item.quantidade, 0)
  );
  readonly vazio = computed(() => this.itensVenda().length === 0);

  adicionar(produto: ProdutoResponse, quantidade = 1, complementos: ComplementoSelecionado[] = []): boolean {
    const quantidadeNormalizada = Math.max(1, Math.trunc(quantidade));
    const complementosNormalizados = this.normalizarComplementosDetalhados(complementos);
    const itemId = this.criarItemId(produto.id, complementosNormalizados);
    const itens = this.itensVenda();
    const itemExistente = itens.find((item) => item.id === itemId);
    const quantidadeAtual = itemExistente?.quantidade ?? 0;
    const novaQuantidade = quantidadeAtual + quantidadeNormalizada;

    if (!this.quantidadePermitida(produto, novaQuantidade)) {
      return false;
    }

    const produtoAtualizado = this.paraProdutoCarrinho(produto);
    const proximosItens = itemExistente
      ? itens.map((item) => item.id === itemId ? { ...item, produto: produtoAtualizado, quantidade: novaQuantidade } : item)
      : [...itens, {
        id: itemId,
        produto: this.paraProdutoCarrinho(produto),
        quantidade: quantidadeNormalizada,
        complementos: complementosNormalizados,
        valorUnitarioEstimado: this.calcularValorUnitario(produto, complementosNormalizados)
      }];

    this.atualizarItens(proximosItens);
    return true;
  }

  sincronizarProdutos(produtos: ProdutoResponse[]): void {
    if (!produtos.length || this.vazio()) {
      return;
    }

    const produtosPorId = new Map(produtos.map((produto) => [produto.id, this.paraProdutoCarrinho(produto)]));
    const itensSincronizados = this.itensVenda().map((item) => {
      const produtoAtualizado = produtosPorId.get(item.produto.id);
      return produtoAtualizado ? { ...item, produto: produtoAtualizado } : item;
    });

    this.atualizarItens(itensSincronizados);
  }

  definirQuantidade(itemId: string, quantidade: number): boolean {
    const quantidadeNormalizada = Math.max(1, Math.trunc(quantidade));
    const item = this.itensVenda().find((itemVenda) => itemVenda.id === itemId);

    if (!item || !this.quantidadePermitida(item.produto, quantidadeNormalizada)) {
      return false;
    }

    this.atualizarItens(
      this.itensVenda().map((itemVenda) =>
        itemVenda.id === itemId ? { ...itemVenda, quantidade: quantidadeNormalizada } : itemVenda
      )
    );
    return true;
  }

  incrementar(itemId: string): boolean {
    const item = this.itensVenda().find((itemVenda) => itemVenda.id === itemId);
    return item ? this.definirQuantidade(itemId, item.quantidade + 1) : false;
  }

  decrementar(itemId: string): boolean {
    const item = this.itensVenda().find((itemVenda) => itemVenda.id === itemId);

    if (!item || item.quantidade <= 1) {
      return false;
    }

    return this.definirQuantidade(itemId, item.quantidade - 1);
  }

  remover(itemId: string): void {
    this.atualizarItens(this.itensVenda().filter((item) => item.id !== itemId));
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

  obterPrecoItem(item: ItemCarrinho): number {
    return Number(item.valorUnitarioEstimado ?? this.calcularValorUnitario(item.produto, item.complementos ?? []));
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
    this.itensVenda.set(itens);
    localStorage.setItem(PDV_KEY, JSON.stringify(itens));
  }

  private carregarVenda(): ItemCarrinho[] {
    const venda = localStorage.getItem(PDV_KEY);

    if (!venda) {
      return [];
    }

    try {
      const itens = JSON.parse(venda) as ItemCarrinho[];
      const itensNormalizados = Array.isArray(itens)
        ? itens
            .filter((item) => item?.produto?.id && item.quantidade > 0)
            .map((item) => ({
              id: item.id ?? this.criarItemId(item.produto.id, this.normalizarComplementosDetalhados(item.complementos ?? [])),
              produto: this.paraProdutoCarrinho(item.produto as ProdutoResponse),
              quantidade: item.quantidade,
              complementos: this.normalizarComplementosDetalhados(item.complementos ?? []),
              valorUnitarioEstimado: this.calcularValorUnitario(
                item.produto as ProdutoResponse,
                this.normalizarComplementosDetalhados(item.complementos ?? [])
              )
            }))
        : [];

      localStorage.setItem(PDV_KEY, JSON.stringify(itensNormalizados));
      return itensNormalizados;
    } catch {
      localStorage.removeItem(PDV_KEY);
      return [];
    }
  }

  private criarItemId(produtoId: number, complementos: ComplementoSelecionado[]): string {
    return `${produtoId}:${chaveComplementos(complementos)}`;
  }

  private normalizarComplementosDetalhados(complementos: ComplementoSelecionado[]): ComplementoSelecionado[] {
    return [...complementos]
      .filter((complemento) => complemento.opcaoComplementoId > 0 && complemento.quantidade > 0)
      .map((complemento) => ({
        opcaoComplementoId: complemento.opcaoComplementoId,
        quantidade: Math.trunc(complemento.quantidade),
        nome: complemento.nome,
        valorAdicional: Number(complemento.valorAdicional ?? 0),
        grupoComplementoId: complemento.grupoComplementoId
      }))
      .sort((a, b) => a.opcaoComplementoId - b.opcaoComplementoId);
  }

  private calcularValorUnitario(
    produto: ProdutoCarrinho | ProdutoResponse,
    complementos: ComplementoSelecionado[]
  ): number {
    return this.obterPreco(produto) +
      complementos.reduce((total, complemento) => total + complemento.valorAdicional * complemento.quantidade, 0);
  }
}
