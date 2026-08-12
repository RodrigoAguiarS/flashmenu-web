export type PixPagamentoStatus = 'PENDENTE' | 'AGUARDANDO_PAGAMENTO' | 'PAGO' | 'EXPIRADO' | 'CANCELADO' | string;

export interface PixCobrancaRequest {
  valor: number;
}

export interface PixCobrancaResponse {
  id: number | string;
  pedidoId: number;
  valor: number;
  status: PixPagamentoStatus;
  qrCode?: string | null;
  qrCodeBase64?: string | null;
  qrCodeUrl?: string | null;
  copiaECola?: string | null;
  pixCopiaCola?: string | null;
  pixCopiaECola?: string | null;
  codigoPix?: string | null;
  pixQrCode?: string | null;
  expiracao?: string | null;
  expiraEm?: string | null;
  criadoEm?: string | null;
}

export interface PixStatusResponse {
  pedidoId: number;
  status: PixPagamentoStatus;
  pago: boolean;
  expirado?: boolean;
  pedidoAtualizado?: unknown;
}
