export interface EnderecoDadosRequest {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  estado: string;
}

export interface EnderecoDadosResponse extends EnderecoDadosRequest {
  id?: number;
  criadoEm?: string;
  atualizadoEm?: string | null;
}

export interface EnderecoRequest extends EnderecoDadosRequest {
  principal: boolean;
}

export interface EnderecoResponse extends EnderecoRequest {
  id: number;
  ativo: boolean;
  usuarioId: number;
  criadoEm: string;
  atualizadoEm?: string | null;
}
