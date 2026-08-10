import { ComplementoSelecionado } from '../models/complemento.model';
import { ItemCarrinho } from '../models/carrinho.model';

export function normalizarComplementos(
  complementos: Pick<ComplementoSelecionado, 'opcaoComplementoId' | 'quantidade'>[] | null | undefined
): { opcaoComplementoId: number; quantidade: number }[] {
  return [...(complementos ?? [])]
    .filter((complemento) => complemento.opcaoComplementoId > 0 && complemento.quantidade > 0)
    .map((complemento) => ({
      opcaoComplementoId: complemento.opcaoComplementoId,
      quantidade: Math.trunc(complemento.quantidade)
    }))
    .sort((a, b) => a.opcaoComplementoId - b.opcaoComplementoId);
}

export function chaveComplementos(
  complementos: Pick<ComplementoSelecionado, 'opcaoComplementoId' | 'quantidade'>[] | null | undefined
): string {
  return normalizarComplementos(complementos)
    .map((complemento) => `${complemento.opcaoComplementoId}x${complemento.quantidade}`)
    .join(',');
}

export function isSameConfiguration(itemA: ItemCarrinho, itemB: ItemCarrinho): boolean {
  return itemA.produto.id === itemB.produto.id &&
    (itemA.observacao ?? '') === (itemB.observacao ?? '') &&
    chaveComplementos(itemA.complementos) === chaveComplementos(itemB.complementos);
}
