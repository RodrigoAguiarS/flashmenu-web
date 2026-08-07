export type TipoFormaPagamento = 'PIX' | 'DINHEIRO' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | string;

export interface FormaPagamentoResponse {
  id: number;
  nome: string;
  tipo: TipoFormaPagamento;
  percentualAcrescimo: number;
  ativo: boolean;
}

export interface FormaPagamentoPercentualRequest {
  percentualAcrescimo: number;
}
