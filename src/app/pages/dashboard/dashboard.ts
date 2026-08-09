import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, finalize } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { StandardError, ValidationError } from '../../core/models/api-error.model';
import {
  DashboardResumoResponse,
  ProdutoEstoqueBaixoResponse,
  ProdutoMaisVendidoResponse,
  VendaPorDiaResponse,
  VendaPorFormaPagamentoResponse
} from '../../core/models/dashboard.model';
import { DashboardService } from '../../core/services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzEmptyModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzInputNumberModule,
    NzSpinModule,
    NzStatisticModule,
    NzTableModule,
    NzTagModule
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Dashboard implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly dashboardService = inject(DashboardService);

  protected readonly carregando = signal(false);
  protected readonly mensagemErro = signal<string | null>(null);
  protected readonly resumo = signal<DashboardResumoResponse | null>(null);
  protected readonly vendasPorDia = signal<VendaPorDiaResponse[]>([]);
  protected readonly produtosMaisVendidos = signal<ProdutoMaisVendidoResponse[]>([]);
  protected readonly vendasPorFormaPagamento = signal<VendaPorFormaPagamentoResponse[]>([]);
  protected readonly produtosEstoqueBaixo = signal<ProdutoEstoqueBaixoResponse[]>([]);
  protected readonly possuiVendasPorDia = computed(() => this.vendasPorDia().length > 0);
  protected readonly possuiProdutosMaisVendidos = computed(() => this.produtosMaisVendidos().length > 0);
  protected readonly possuiFormasPagamento = computed(() => this.vendasPorFormaPagamento().length > 0);
  protected readonly possuiEstoqueBaixo = computed(() => this.produtosEstoqueBaixo().length > 0);
  protected readonly maiorFaturamentoDia = computed(() =>
    Math.max(...this.vendasPorDia().map((venda) => Number(venda.faturamento)), 0)
  );
  protected readonly maiorQuantidadeVendida = computed(() =>
    Math.max(...this.produtosMaisVendidos().map((produto) => Number(produto.quantidadeVendida)), 0)
  );
  protected readonly maiorFaturamentoFormaPagamento = computed(() =>
    Math.max(...this.vendasPorFormaPagamento().map((forma) => Number(forma.faturamento)), 0)
  );

  protected readonly filtros = this.fb.group({
    dataInicio: [this.dataInicialPadrao(), [Validators.required]],
    dataFim: [this.hoje(), [Validators.required]],
    limiteProdutos: this.fb.control<number | null>(10, [Validators.min(1), Validators.max(100)]),
    limiteEstoque: this.fb.control<number | null>(5, [Validators.min(0)])
  });

  ngOnInit(): void {
    this.carregarDashboard();
  }

  protected filtrar(): void {
    this.carregarDashboard();
  }

  protected percentual(valor: number, total: number): number {
    if (!total) {
      return 0;
    }

    return Math.max(4, Math.round((Number(valor) / total) * 100));
  }

  private carregarDashboard(): void {
    this.mensagemErro.set(null);

    if (this.filtros.invalid) {
      this.filtros.markAllAsTouched();
      return;
    }

    const filtros = this.filtros.getRawValue();

    if (filtros.dataFim < filtros.dataInicio) {
      this.mensagemErro.set('Data final deve ser maior ou igual a data inicial.');
      return;
    }

    const periodo = {
      dataInicio: filtros.dataInicio,
      dataFim: filtros.dataFim
    };

    this.carregando.set(true);

    forkJoin({
      resumo: this.dashboardService.buscarResumo(periodo),
      vendasPorDia: this.dashboardService.buscarVendasPorDia(periodo),
      produtosMaisVendidos: this.dashboardService.buscarProdutosMaisVendidos(periodo, filtros.limiteProdutos ?? undefined),
      vendasPorFormaPagamento: this.dashboardService.buscarVendasPorFormaPagamento(periodo),
      produtosEstoqueBaixo: this.dashboardService.buscarProdutosComEstoqueBaixo(filtros.limiteEstoque ?? undefined)
    }).pipe(
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: (dados) => {
        this.resumo.set(dados.resumo);
        this.vendasPorDia.set(dados.vendasPorDia);
        this.produtosMaisVendidos.set(dados.produtosMaisVendidos);
        this.vendasPorFormaPagamento.set(dados.vendasPorFormaPagamento);
        this.produtosEstoqueBaixo.set(dados.produtosEstoqueBaixo);
      },
      error: (error: HttpErrorResponse) => {
        this.limparDados();
        this.mensagemErro.set(this.extrairMensagemErro(error));
      }
    });
  }

  private limparDados(): void {
    this.resumo.set(null);
    this.vendasPorDia.set([]);
    this.produtosMaisVendidos.set([]);
    this.vendasPorFormaPagamento.set([]);
    this.produtosEstoqueBaixo.set([]);
  }

  private dataInicialPadrao(): string {
    const data = new Date();
    data.setDate(1);
    return this.formatarData(data);
  }

  private hoje(): string {
    return this.formatarData(new Date());
  }

  private formatarData(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private extrairMensagemErro(error: HttpErrorResponse): string {
    const body = error.error;

    if (this.ehErroValidacao(body)) {
      return body.errors.map((erroCampo) => erroCampo.message).join(' ');
    }

    if (this.ehErroPadrao(body)) {
      return body.message || body.error || 'Nao foi possivel carregar o dashboard.';
    }

    return 'Nao foi possivel carregar o dashboard.';
  }

  private ehErroValidacao(value: unknown): value is ValidationError {
    return !!value && typeof value === 'object' && Array.isArray((value as ValidationError).errors);
  }

  private ehErroPadrao(value: unknown): value is StandardError {
    return !!value && typeof value === 'object' && 'message' in value;
  }
}
