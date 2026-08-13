import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of, switchMap, tap } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { HorarioFuncionamentoResponse } from '../../core/models/horario-funcionamento.model';
import { UnidadeResponse } from '../../core/models/unidade.model';
import { CarrinhoService } from '../../core/services/carrinho.service';
import { UnidadeService } from '../../core/services/unidade.service';
import {
  encontrarProximaAbertura,
  estaAbertaAgora,
  montarHorariosSemana
} from '../../core/utils/horario-funcionamento.util';
import { montarUrlPublicaLoja } from '../../core/utils/loja-publica-url.util';

type EstadoLoja = 'carregando' | 'encontrada' | 'nao-encontrada' | 'erro';

@Component({
  selector: 'app-loja-publica',
  standalone: true,
  imports: [
    RouterLink,
    NzAlertModule,
    NzButtonModule,
    NzDrawerModule,
    NzEmptyModule,
    NzIconModule,
    NzResultModule,
    NzSpinModule,
    NzTagModule
  ],
  templateUrl: './loja-publica.component.html',
  styleUrl: './loja-publica.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LojaPublicaComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly carrinhoService = inject(CarrinhoService);
  private readonly unidadeService = inject(UnidadeService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly unidadeSlug = signal<string | null>(null);
  protected readonly unidade = signal<UnidadeResponse | null>(null);
  protected readonly horarios = signal<HorarioFuncionamentoResponse[]>([]);
  protected readonly estado = signal<EstadoLoja>('carregando');
  protected readonly carregando = computed(() => this.estado() === 'carregando');
  protected readonly mensagemErro = signal<string | null>(null);
  protected readonly horariosVisiveis = signal(false);
  protected readonly imagemInvalida = signal(false);
  protected readonly linkCardapio = computed(() => {
    const slug = this.unidadeSlug();
    return slug ? ['/cardapio', slug] : this.carrinhoService.cardapioLink();
  });

  protected readonly iniciaisUnidade = computed(() => {
    const nome = this.unidade()?.nome?.trim();

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

  protected readonly enderecoLinhaPrincipal = computed(() => {
    const endereco = this.unidade()?.endereco;

    if (!endereco) {
      return null;
    }

    const logradouro = [endereco.logradouro, endereco.numero].filter(Boolean).join(', ');
    return [logradouro, endereco.complemento].filter(Boolean).join(' - ') || null;
  });

  protected readonly enderecoLinhaLocalidade = computed(() => {
    const endereco = this.unidade()?.endereco;

    if (!endereco) {
      return null;
    }

    const cidadeEstado = [endereco.cidade, endereco.estado].filter(Boolean).join('/');
    return [endereco.bairro, cidadeEstado].filter(Boolean).join(' · ') || null;
  });

  protected readonly imagemLoja = computed(() => {
    if (this.imagemInvalida()) {
      return null;
    }

    const unidade = this.unidade();
    return unidade?.logoUrl ?? unidade?.imagemUrl ?? null;
  });

  protected readonly horariosSemana = computed(() => montarHorariosSemana(this.horarios()));

  protected readonly lojaAberta = computed(() => {
    const unidade = this.unidade();

    if (!unidade?.ativo) {
      return false;
    }

    if (typeof unidade.abertaAgora === 'boolean') {
      return unidade.abertaAgora;
    }

    return estaAbertaAgora(this.horarios());
  });

  protected readonly statusTexto = computed(() => this.lojaAberta() ? 'Aberto agora' : 'Fechado agora');
  protected readonly statusComplementoTexto = computed(() => {
    if (!this.lojaAberta()) {
      return encontrarProximaAbertura(this.horarios());
    }

    const horarioHoje = this.horariosSemana().find((horario) => horario.hoje);

    if (!horarioHoje?.horaFechamento) {
      return null;
    }

    return `Fecha as ${horarioHoje.horaFechamento}`;
  });

  ngOnInit(): void {
    this.observarSlug();
  }

  protected abrirHorarios(): void {
    this.horariosVisiveis.set(true);
  }

  protected fecharHorarios(): void {
    this.horariosVisiveis.set(false);
  }

  protected marcarImagemInvalida(): void {
    this.imagemInvalida.set(true);
  }

  protected compartilhar(): void {
    const titulo = this.unidade()?.nome ?? 'FlashMenu';
    const url = montarUrlPublicaLoja(window.location.origin, this.unidadeSlug());

    if (navigator.share) {
      void navigator.share({
        title: titulo,
        text: `Veja a loja ${titulo} no FlashMenu`,
        url
      }).catch(() => undefined);
      return;
    }

    if (!navigator.clipboard) {
      this.message.info(url);
      return;
    }

    void navigator.clipboard.writeText(url)
      .then(() => this.message.success('Link da loja copiado.'))
      .catch(() => this.message.info(url));
  }

  private observarSlug(): void {
    this.route.paramMap
      .pipe(
        tap(() => this.iniciarCarregamento()),
        switchMap((params) => {
          const slug = params.get('unidadeSlug')?.trim() || null;
          this.unidadeSlug.set(slug);

          if (!slug) {
            this.carrinhoService.limparContextoUnidade();
            this.estado.set('nao-encontrada');
            return of(null);
          }

          this.carrinhoService.definirUnidadeSlug(slug);
          return this.carregarLoja(slug);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((resultado) => {
        if (!resultado) {
          return;
        }

        this.unidade.set(resultado.unidade);
        this.horarios.set(resultado.horarios);
        this.estado.set('encontrada');
      });
  }

  private carregarLoja(slug: string) {
    return this.unidadeService.buscarPublicaPorSlug(slug).pipe(
      switchMap((unidade) =>
        forkJoin({
          unidade: of(unidade),
          horarios: this.unidadeService.listarHorariosPublicos(unidade.id).pipe(
            catchError(() => of([] as HorarioFuncionamentoResponse[]))
          )
        })
      ),
      catchError((error: HttpErrorResponse) => {
        this.tratarErroCarregamento(error);
        return of(null);
      }),
      finalize(() => {
        if (this.estado() === 'carregando') {
          this.estado.set('encontrada');
        }
      })
    );
  }

  private iniciarCarregamento(): void {
    this.estado.set('carregando');
    this.mensagemErro.set(null);
    this.unidade.set(null);
    this.horarios.set([]);
    this.horariosVisiveis.set(false);
    this.imagemInvalida.set(false);
  }

  private tratarErroCarregamento(error: HttpErrorResponse): void {
    if (error.status === 404 || error.status === 410) {
      this.estado.set('nao-encontrada');
      return;
    }

    this.estado.set('erro');
    this.mensagemErro.set(this.extrairMensagemErro(error));
  }

  private extrairMensagemErro(error: HttpErrorResponse): string {
    const body = error.error;

    if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
      return body.message;
    }

    return 'Nao foi possivel carregar as informacoes da loja.';
  }
}
