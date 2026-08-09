import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { PERMISSOES } from '../../core/auth/permissoes';
import { StandardError, ValidationError } from '../../core/models/api-error.model';
import {
  ConfiguracaoComercialRequest,
  ConfiguracaoComercialResponse
} from '../../core/models/configuracao-comercial.model';
import { AuthService } from '../../core/services/auth.service';
import { ConfiguracaoComercialService } from '../../core/services/configuracao-comercial.service';

@Component({
  selector: 'app-configuracao-comercial',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    FormsModule,
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputNumberModule,
    NzSpinModule,
    NzTagModule
  ],
  templateUrl: './configuracao-comercial.component.html',
  styleUrl: './configuracao-comercial.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfiguracaoComercialComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly configuracaoService = inject(ConfiguracaoComercialService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly configuracao = signal<ConfiguracaoComercialResponse | null>(null);
  protected readonly valoresFormulario = signal<ConfiguracaoComercialRequest>(this.valoresPadrao());
  protected readonly carregando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly mensagemErro = signal<string | null>(null);
  protected readonly valorBaseSimulacao = signal(100);

  protected readonly configuracaoExiste = computed(() => this.configuracao() !== null);
  protected readonly podeCriar = computed(() => this.authService.possuiPermissao(PERMISSOES.CONFIGURACAO_COMERCIAL_CRIAR));
  protected readonly podeEditar = computed(() => this.authService.possuiPermissao(PERMISSOES.CONFIGURACAO_COMERCIAL_EDITAR));
  protected readonly podeSalvar = computed(() => this.configuracaoExiste() ? this.podeEditar() : this.podeCriar());
  protected readonly modoTela = computed(() => this.configuracaoExiste() ? 'Atualizacao' : 'Cadastro');
  protected readonly textoBotao = computed(() => this.configuracaoExiste() ? 'Salvar alteracoes' : 'Criar configuracao');
  protected readonly valorMargem = computed(() =>
    this.calcularPercentual(this.valorBaseSimulacao(), this.valoresFormulario().percentualMargemLucro)
  );
  protected readonly valorDesconto = computed(() =>
    this.calcularPercentual(this.valorBaseSimulacao(), this.valoresFormulario().percentualDescontoPadrao)
  );
  protected readonly valorVendaSimulado = computed(() =>
    this.normalizarMoeda(
      this.valorBaseSimulacao() + this.valorMargem() - this.valorDesconto() + this.valoresFormulario().valorTaxaFixa
    )
  );

  protected readonly form = this.fb.group({
    percentualMargemLucro: this.fb.control(0, [Validators.required, Validators.min(0), Validators.max(999.99)]),
    percentualDescontoPadrao: this.fb.control(0, [Validators.required, Validators.min(0), Validators.max(100)]),
    valorTaxaFixa: this.fb.control(0, [Validators.required, Validators.min(0)])
  });

  ngOnInit(): void {
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.valoresFormulario.set(this.montarRequest()));

    this.carregarConfiguracao();
  }

  protected alterarValorBase(valor: number | null): void {
    this.valorBaseSimulacao.set(this.normalizarMoeda(valor ?? 0));
  }

  protected salvar(): void {
    if (!this.podeSalvar()) {
      this.message.warning('Seu usuario nao possui permissao para salvar esta configuracao.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const request = this.montarRequest();
    const operacao = this.configuracaoExiste()
      ? this.configuracaoService.atualizar(request)
      : this.configuracaoService.criar(request);

    this.salvando.set(true);
    this.mensagemErro.set(null);

    operacao.pipe(
      finalize(() => this.salvando.set(false))
    ).subscribe({
      next: (configuracao) => {
        this.configuracao.set(configuracao);
        this.preencherFormulario(configuracao);
        this.message.success('Configuracao comercial salva com sucesso.');
      },
      error: (error: HttpErrorResponse) => {
        this.mensagemErro.set(this.extrairMensagemErro(error));
      }
    });
  }

  protected recarregar(): void {
    this.carregarConfiguracao();
  }

  private carregarConfiguracao(): void {
    this.carregando.set(true);
    this.mensagemErro.set(null);

    this.configuracaoService.buscar().pipe(
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: (configuracao) => {
        this.configuracao.set(configuracao);
        this.preencherFormulario(configuracao);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.configuracao.set(null);
          this.preencherFormulario(this.valoresPadrao());
          return;
        }

        this.mensagemErro.set(this.extrairMensagemErro(error));
      }
    });
  }

  private preencherFormulario(configuracao: ConfiguracaoComercialRequest): void {
    this.form.reset({
      percentualMargemLucro: configuracao.percentualMargemLucro,
      percentualDescontoPadrao: configuracao.percentualDescontoPadrao,
      valorTaxaFixa: configuracao.valorTaxaFixa
    });
    this.valoresFormulario.set(this.montarRequest());
  }

  private montarRequest(): ConfiguracaoComercialRequest {
    const valores = this.form.getRawValue();

    return {
      percentualMargemLucro: this.normalizarMoeda(valores.percentualMargemLucro),
      percentualDescontoPadrao: this.normalizarMoeda(valores.percentualDescontoPadrao),
      valorTaxaFixa: this.normalizarMoeda(valores.valorTaxaFixa)
    };
  }

  private valoresPadrao(): ConfiguracaoComercialRequest {
    return {
      percentualMargemLucro: 0,
      percentualDescontoPadrao: 0,
      valorTaxaFixa: 0
    };
  }

  private calcularPercentual(valor: number, percentual: number): number {
    return this.normalizarMoeda(valor * percentual / 100);
  }

  private normalizarMoeda(valor: number): number {
    return Number(Number(valor).toFixed(2));
  }

  private extrairMensagemErro(error: HttpErrorResponse): string {
    const body = error.error;

    if (this.ehErroValidacao(body)) {
      return body.errors.map((erroCampo) => erroCampo.message).join(' ');
    }

    if (this.ehErroPadrao(body)) {
      return body.message || body.error || 'Nao foi possivel salvar a configuracao comercial.';
    }

    return 'Nao foi possivel salvar a configuracao comercial.';
  }

  private ehErroValidacao(value: unknown): value is ValidationError {
    return !!value && typeof value === 'object' && Array.isArray((value as ValidationError).errors);
  }

  private ehErroPadrao(value: unknown): value is StandardError {
    return !!value && typeof value === 'object' && 'message' in value;
  }
}
