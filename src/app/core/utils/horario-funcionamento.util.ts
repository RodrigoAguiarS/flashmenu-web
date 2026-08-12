import { DiaSemana, DIAS_SEMANA, HorarioFuncionamentoResponse } from '../models/horario-funcionamento.model';

export interface HorarioSemanaView {
  diaSemana: DiaSemana;
  label: string;
  ativo: boolean;
  horaAbertura: string | null;
  horaFechamento: string | null;
  hoje: boolean;
}

const DIAS_POR_DATA: readonly DiaSemana[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY'
];

export function diaSemanaAtual(data = new Date()): DiaSemana {
  return DIAS_POR_DATA[data.getDay()];
}

export function montarHorariosSemana(
  horarios: readonly HorarioFuncionamentoResponse[],
  data = new Date()
): HorarioSemanaView[] {
  const horariosPorDia = new Map(horarios.map((horario) => [horario.diaSemana, horario]));
  const hoje = diaSemanaAtual(data);

  return DIAS_SEMANA.map((dia) => {
    const horario = horariosPorDia.get(dia.value);
    const horaAbertura = formatarHora(horario?.horaAbertura);
    const horaFechamento = formatarHora(horario?.horaFechamento);

    return {
      diaSemana: dia.value,
      label: dia.label,
      ativo: horario?.ativo === true && !!horaAbertura && !!horaFechamento,
      horaAbertura,
      horaFechamento,
      hoje: dia.value === hoje
    };
  });
}

export function estaAbertaAgora(horarios: readonly HorarioFuncionamentoResponse[], data = new Date()): boolean {
  const horario = horarios.find((item) => item.diaSemana === diaSemanaAtual(data));

  if (!horario?.ativo || !horario.horaAbertura || !horario.horaFechamento) {
    return false;
  }

  const abertura = paraMinutos(horario.horaAbertura);
  const fechamento = paraMinutos(horario.horaFechamento);

  if (abertura === null || fechamento === null) {
    return false;
  }

  const minutosAgora = data.getHours() * 60 + data.getMinutes();
  return minutosAgora >= abertura && minutosAgora < fechamento;
}

export function encontrarProximaAbertura(
  horarios: readonly HorarioFuncionamentoResponse[],
  data = new Date()
): string | null {
  const semana = montarHorariosSemana(horarios, data);
  const hojeIndex = semana.findIndex((horario) => horario.diaSemana === diaSemanaAtual(data));

  if (hojeIndex < 0) {
    return null;
  }

  const minutosAgora = data.getHours() * 60 + data.getMinutes();

  for (let deslocamento = 0; deslocamento < 7; deslocamento += 1) {
    const horario = semana[(hojeIndex + deslocamento) % 7];

    if (!horario.ativo || !horario.horaAbertura) {
      continue;
    }

    const abertura = paraMinutos(horario.horaAbertura);

    if (abertura === null || (deslocamento === 0 && abertura <= minutosAgora)) {
      continue;
    }

    const prefixo = deslocamento === 0
      ? 'Abre hoje'
      : deslocamento === 1
        ? 'Abre amanha'
        : `Abre ${horario.label.toLowerCase()}`;

    return `${prefixo} as ${horario.horaAbertura}`;
  }

  return null;
}

export function horarioHojeTexto(horarios: readonly HorarioFuncionamentoResponse[], data = new Date()): string {
  const horario = montarHorariosSemana(horarios, data).find((item) => item.hoje);

  if (!horario?.ativo || !horario.horaAbertura || !horario.horaFechamento) {
    return 'Hoje: Fechado';
  }

  return `Hoje: ${horario.horaAbertura} as ${horario.horaFechamento}`;
}

export function formatarHora(horario: string | null | undefined): string | null {
  if (!horario) {
    return null;
  }

  const [horas, minutos] = horario.split(':');

  if (!horas || !minutos) {
    return null;
  }

  return `${horas.padStart(2, '0')}:${minutos.padStart(2, '0')}`;
}

function paraMinutos(horario: string): number | null {
  const [horas, minutos] = horario.split(':').map(Number);

  if (!Number.isFinite(horas) || !Number.isFinite(minutos)) {
    return null;
  }

  return horas * 60 + minutos;
}
