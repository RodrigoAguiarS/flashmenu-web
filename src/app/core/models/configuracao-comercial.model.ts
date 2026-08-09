export interface ConfiguracaoComercialRequest {
  percentualMargemLucro: number;
  percentualDescontoPadrao: number;
  valorTaxaFixa: number;
}

export interface ConfiguracaoComercialResponse extends ConfiguracaoComercialRequest {
  id: number;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm?: string | null;
}
