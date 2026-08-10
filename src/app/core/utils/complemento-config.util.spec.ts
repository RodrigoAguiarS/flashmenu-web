import { ItemCarrinho } from '../models/carrinho.model';
import { chaveComplementos, isSameConfiguration, normalizarComplementos } from './complemento-config.util';

describe('complemento-config util', () => {
  it('normaliza complementos por id e ignora quantidade invalida', () => {
    expect(normalizarComplementos([
      { opcaoComplementoId: 3, quantidade: 2 },
      { opcaoComplementoId: 1, quantidade: 1 },
      { opcaoComplementoId: 2, quantidade: 0 }
    ])).toEqual([
      { opcaoComplementoId: 1, quantidade: 1 },
      { opcaoComplementoId: 3, quantidade: 2 }
    ]);
  });

  it('gera a mesma chave para a mesma composicao em ordem diferente', () => {
    expect(chaveComplementos([
      { opcaoComplementoId: 10, quantidade: 1 },
      { opcaoComplementoId: 4, quantidade: 2 }
    ])).toBe(chaveComplementos([
      { opcaoComplementoId: 4, quantidade: 2 },
      { opcaoComplementoId: 10, quantidade: 1 }
    ]));
  });

  it('compara produto, observacao e complementos', () => {
    const base = item([
      { opcaoComplementoId: 2, quantidade: 1, nome: 'Bacon', valorAdicional: 4, grupoComplementoId: 1 }
    ]);
    const mesmaConfiguracao = item([
      { opcaoComplementoId: 2, quantidade: 1, nome: 'Bacon', valorAdicional: 4, grupoComplementoId: 1 }
    ]);
    const outraConfiguracao = item([
      { opcaoComplementoId: 3, quantidade: 1, nome: 'Queijo', valorAdicional: 3, grupoComplementoId: 1 }
    ]);

    expect(isSameConfiguration(base, mesmaConfiguracao)).toBe(true);
    expect(isSameConfiguration(base, outraConfiguracao)).toBe(false);
  });

  function item(complementos: ItemCarrinho['complementos']): ItemCarrinho {
    return {
      id: '1',
      produto: {
        id: 1,
        nome: 'X-Bacon',
        descricao: 'Lanche',
        categoria: { id: 1, nome: 'Lanches', descricao: '', ativo: true, criadoEm: '', atualizadoEm: '' },
        valorVenda: 20,
        imagemUrl: null,
        arquivosUrl: [],
        quantidadeEstoque: 10
      },
      quantidade: 1,
      observacao: null,
      complementos
    };
  }
});
