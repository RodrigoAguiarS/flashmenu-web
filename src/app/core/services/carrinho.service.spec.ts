import { TestBed } from '@angular/core/testing';

import { ProdutoResponse } from '../models/produto.model';
import { CarrinhoService } from './carrinho.service';

describe('CarrinhoService complementos', () => {
  let service: CarrinhoService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CarrinhoService);
    service.limpar();
  });

  it('adiciona produto sem complemento', () => {
    expect(service.adicionar(produto())).toBe(true);
    expect(service.itens()).toHaveLength(1);
    expect(service.valorTotal()).toBe(20);
  });

  it('soma complemento na estimativa visual', () => {
    service.adicionar(produto(), 1, null, [
      { opcaoComplementoId: 1, quantidade: 2, nome: 'Queijo', valorAdicional: 3, grupoComplementoId: 1 }
    ]);

    expect(service.itens()[0].valorUnitarioEstimado).toBe(26);
    expect(service.valorTotal()).toBe(26);
  });

  it('mantem itens separados para complementos diferentes', () => {
    service.adicionar(produto(), 1, null, [
      { opcaoComplementoId: 1, quantidade: 1, nome: 'Bacon', valorAdicional: 4, grupoComplementoId: 1 }
    ]);
    service.adicionar(produto(), 1, null, [
      { opcaoComplementoId: 2, quantidade: 1, nome: 'Queijo', valorAdicional: 3, grupoComplementoId: 1 }
    ]);

    expect(service.itens()).toHaveLength(2);
  });

  it('incrementa quantidade quando a composicao e identica em ordem diferente', () => {
    service.adicionar(produto(), 1, null, [
      { opcaoComplementoId: 2, quantidade: 1, nome: 'Queijo', valorAdicional: 3, grupoComplementoId: 1 },
      { opcaoComplementoId: 1, quantidade: 1, nome: 'Bacon', valorAdicional: 4, grupoComplementoId: 1 }
    ]);
    service.adicionar(produto(), 2, null, [
      { opcaoComplementoId: 1, quantidade: 1, nome: 'Bacon', valorAdicional: 4, grupoComplementoId: 1 },
      { opcaoComplementoId: 2, quantidade: 1, nome: 'Queijo', valorAdicional: 3, grupoComplementoId: 1 }
    ]);

    expect(service.itens()).toHaveLength(1);
    expect(service.itens()[0].quantidade).toBe(3);
  });

  it('edita personalizacao e junta com item equivalente', () => {
    service.adicionar(produto(), 1, null, [
      { opcaoComplementoId: 1, quantidade: 1, nome: 'Bacon', valorAdicional: 4, grupoComplementoId: 1 }
    ]);
    service.adicionar(produto(), 1, null, [
      { opcaoComplementoId: 2, quantidade: 1, nome: 'Queijo', valorAdicional: 3, grupoComplementoId: 1 }
    ]);

    const itemBacon = service.itens()[0];
    expect(service.atualizarConfiguracao(itemBacon.id, [
      { opcaoComplementoId: 2, quantidade: 1, nome: 'Queijo', valorAdicional: 3, grupoComplementoId: 1 }
    ], null, 1)).toBe(true);

    expect(service.itens()).toHaveLength(1);
    expect(service.itens()[0].quantidade).toBe(2);
  });

  function produto(): ProdutoResponse {
    return {
      id: 1,
      nome: 'X-Bacon',
      descricao: 'Lanche',
      categoria: { id: 1, nome: 'Lanches', descricao: '', ativo: true, criadoEm: '', atualizadoEm: '' },
      valorVenda: 20,
      imagemUrl: null,
      arquivosUrl: [],
      valorFornecedor: 12,
      quantidadeEstoque: 10,
      criadoEm: '',
      atualizadoEm: ''
    };
  }
});
