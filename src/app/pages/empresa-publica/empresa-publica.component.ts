import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { EmpresaResponse } from '../../core/models/empresa.model';
import { HorarioFuncionamentoResponse } from '../../core/models/horario-funcionamento.model';
import { UnidadeResponse } from '../../core/models/unidade.model';
import { EmpresaService } from '../../core/services/empresa.service';
import { UnidadeService } from '../../core/services/unidade.service';
import { encontrarProximaAbertura, estaAbertaAgora, montarHorariosSemana } from '../../core/utils/horario-funcionamento.util';
import { TelefonePipe } from '../../shared/pipes/telefone.pipe';

@Component({
  selector: 'app-empresa-publica',
  standalone: true,
  imports: [
    RouterLink,
    NzAlertModule,
    NzButtonModule,
    NzEmptyModule,
    NzIconModule,
    NzResultModule,
    NzSpinModule,
    NzTagModule,
    TelefonePipe
  ],
  templateUrl: './empresa-publica.component.html',
  styleUrl: './empresa-publica.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmpresaPublicaComponent implements OnInit {
  private readonly empresaService = inject(EmpresaService);
  private readonly unidadeService = inject(UnidadeService);
  private readonly router = inject(Router);

  protected readonly empresa = signal<EmpresaResponse | null>(null);
  protected readonly unidades = signal<UnidadeResponse[]>([]);
  protected readonly horariosPorUnidade = signal<Record<number, HorarioFuncionamentoResponse[]>>({});
  protected readonly carregando = signal(false);
  protected readonly mensagemErro = signal<string | null>(null);

  protected readonly unidadesAtivas = computed(() =>
    this.unidades()
      .filter((unidade) => unidade.ativo)
      .sort((a, b) => a.nome.localeCompare(b.nome))
  );

  protected readonly iniciaisEmpresa = computed(() => {
    const nome = this.empresa()?.nomeFantasia?.trim();

    if (!nome) {
      return 'FM';
    }

    return nome
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('')
      .toUpperCase();
  });

  ngOnInit(): void {
    this.carregarPagina();
  }

  protected cidadeEstado(unidade: UnidadeResponse): string | null {
    const endereco = unidade.endereco;

    if (!endereco?.cidade && !endereco?.estado) {
      return null;
    }

    return [endereco?.bairro, [endereco?.cidade, endereco?.estado].filter(Boolean).join('/')].filter(Boolean).join(' · ');
  }

  protected enderecoPrincipal(unidade: UnidadeResponse): string | null {
    const endereco = unidade.endereco;

    if (!endereco) {
      return null;
    }

    return [endereco.logradouro, endereco.numero].filter(Boolean).join(', ') || null;
  }

  protected contatoUnidade(unidade: UnidadeResponse): string | null {
    return unidade.whatsapp ?? unidade.telefoneWhatsapp ?? unidade.telefone ?? null;
  }

  protected logoUnidade(unidade: UnidadeResponse): string | null {
    return unidade.logoUrl ?? unidade.imagemUrl ?? null;
  }

  protected iniciaisUnidade(unidade: UnidadeResponse): string {
    return unidade.nome
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('')
      .toUpperCase() || 'FM';
  }

  protected statusTexto(unidade: UnidadeResponse): string {
    if (!unidade.ativo) {
      return 'Indisponivel';
    }

    return this.lojaAberta(unidade) ? 'Aberto agora' : 'Fechado';
  }

  protected statusDetalhe(unidade: UnidadeResponse): string | null {
    if (!unidade.ativo) {
      return 'Unidade indisponivel';
    }

    const horarios = this.horariosUnidade(unidade);

    if (this.lojaAberta(unidade)) {
      const horarioHoje = montarHorariosSemana(horarios).find((horario) => horario.hoje);
      return horarioHoje?.horaFechamento ? `Fecha as ${horarioHoje.horaFechamento}` : null;
    }

    return encontrarProximaAbertura(horarios);
  }

  protected lojaAberta(unidade: UnidadeResponse): boolean {
    if (!unidade.ativo) {
      return false;
    }

    if (typeof unidade.abertaAgora === 'boolean') {
      return unidade.abertaAgora;
    }

    return estaAbertaAgora(this.horariosUnidade(unidade));
  }

  protected statusCor(unidade: UnidadeResponse): string {
    return this.lojaAberta(unidade) ? 'success' : 'default';
  }

  private horariosUnidade(unidade: UnidadeResponse): HorarioFuncionamentoResponse[] {
    return this.horariosPorUnidade()[unidade.id] ?? [];
  }

  private carregarPagina(): void {
    this.carregando.set(true);
    this.mensagemErro.set(null);

    forkJoin({
      empresa: this.empresaService.buscar(),
      unidades: this.unidadeService.listar()
    }).pipe(
      switchMap(({ empresa, unidades }) => {
        const unidadesAtivas = unidades
          .filter((unidade) => unidade.ativo)
          .sort((a, b) => a.nome.localeCompare(b.nome));

        if (unidadesAtivas.length === 1) {
          void this.router.navigate(['/loja', unidadesAtivas[0].slug], { replaceUrl: true });
          return of(null);
        }

        if (!unidadesAtivas.length) {
          return of({ empresa, unidades, horariosPorUnidade: {} });
        }

        const horariosRequests = unidadesAtivas.map((unidade) =>
          this.unidadeService.listarHorariosPublicos(unidade.id).pipe(
            catchError(() => of([] as HorarioFuncionamentoResponse[])),
            map((horarios) => [unidade.id, horarios] as const)
          )
        );

        return forkJoin(horariosRequests).pipe(
          map((entries) => ({
            empresa,
            unidades,
            horariosPorUnidade: Object.fromEntries(entries) as Record<number, HorarioFuncionamentoResponse[]>
          }))
        );
      }),
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: (resultado) => {
        if (!resultado) {
          return;
        }

        const { empresa, unidades, horariosPorUnidade } = resultado;
        this.empresa.set(empresa);
        this.unidades.set(unidades);
        this.horariosPorUnidade.set(horariosPorUnidade);
      },
      error: (error: HttpErrorResponse) => {
        this.empresa.set(null);
        this.unidades.set([]);
        this.horariosPorUnidade.set({});
        this.mensagemErro.set(this.extrairMensagemErro(error));
      }
    });
  }

  private extrairMensagemErro(error: HttpErrorResponse): string {
    const body = error.error;

    if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
      return body.message;
    }

    return 'Nao foi possivel carregar as lojas disponiveis.';
  }
}
