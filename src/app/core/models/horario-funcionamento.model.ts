export type DiaSemana =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface HorarioFuncionamentoRequest {
  diaSemana: DiaSemana;
  horaAbertura: string | null;
  horaFechamento: string | null;
  ativo: boolean;
}

export interface HorarioFuncionamentoResponse extends HorarioFuncionamentoRequest {
  id: number;
}

export interface DiaSemanaOption {
  value: DiaSemana;
  label: string;
}

export const DIAS_SEMANA: readonly DiaSemanaOption[] = [
  { value: 'MONDAY', label: 'Segunda-feira' },
  { value: 'TUESDAY', label: 'Terca-feira' },
  { value: 'WEDNESDAY', label: 'Quarta-feira' },
  { value: 'THURSDAY', label: 'Quinta-feira' },
  { value: 'FRIDAY', label: 'Sexta-feira' },
  { value: 'SATURDAY', label: 'Sabado' },
  { value: 'SUNDAY', label: 'Domingo' }
];
