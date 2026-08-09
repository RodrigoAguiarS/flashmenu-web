export interface EnderecoRequest {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  principal: boolean;
}

export interface EnderecoResponse extends EnderecoRequest {
  id: number;
  ativo: boolean;
  usuarioId: number;
  criadoEm: string;
  atualizadoEm?: string | null;
}
