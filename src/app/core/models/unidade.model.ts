import { EnderecoDadosRequest, EnderecoDadosResponse } from './endereco.model';

export interface UnidadeResumo {
  id: number;
  empresaId: number;
  nome: string;
  slug: string;
  ativo: boolean;
  telefone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  telefoneWhatsapp?: string | null;
  pedidoMinimo?: number | null;
  valorPedidoMinimo?: number | null;
  logoUrl?: string | null;
  imagemUrl?: string | null;
  abertaAgora?: boolean | null;
  endereco?: EnderecoDadosResponse | null;
}

export interface UnidadeResponse extends UnidadeResumo {
  criadoEm: string;
  atualizadoEm: string;
}

export interface UnidadeRequest {
  nome: string;
  slug: string;
  ativo: boolean;
  endereco: EnderecoDadosRequest;
}
