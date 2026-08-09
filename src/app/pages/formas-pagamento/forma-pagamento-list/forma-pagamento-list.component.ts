import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { PERMISSOES } from '../../../core/auth/permissoes';
import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { FormaPagamentoResponse, TipoFormaPagamento } from '../../../core/models/forma-pagamento.model';
import { AuthService } from '../../../core/services/auth.service';
import { FormaPagamentoService } from '../../../core/services/forma-pagamento.service';

@Component({
  selector: 'app-forma-pagamento-list',
  standalone: true,
  imports: [
    DecimalPipe,
    FormsModule,
    NzButtonModule,
    NzEmptyModule,
    NzIconModule,
    NzInputNumberModule,
    NzSpinModule,
    NzTagModule
  ],
  templateUrl: './forma-pagamento-list.component.html',
  styleUrl: './forma-pagamento-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormaPagamentoListComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly formaPagamentoService = inject(FormaPagamentoService);
  private readonly message = inject(NzMessageService);

  protected readonly carregando = signal(false);
  protected readonly salvandoId = signal<number | null>(null);
  protected readonly formasPagamento = signal<FormaPagamentoResponse[]>([]);
  protected readonly percentuais = signal<Record<number, number>>({});
  protected readonly possuiFormasPagamento = computed(() => this.formasPagamento().length > 0);
  protected readonly podeEditarFormaPagamento = computed(() => this.authService.possuiPermissao(PERMISSOES.FORMA_PAGAMENTO_EDITAR));

  ngOnInit(): void {
    this.carregarFormasPagamento();
  }

  protected alterarPercentual(id: number, valor: number | null): void {
    this.percentuais.update((percentuais) => ({
      ...percentuais,
      [id]: this.normalizarPercentual(valor)
    }));
  }

  protected salvarPercentual(formaPagamento: FormaPagamentoResponse): void {
    const percentualAcrescimo = this.normalizarPercentual(this.percentuais()[formaPagamento.id]);

    this.salvandoId.set(formaPagamento.id);

    this.formaPagamentoService.atualizarPercentualAcrescimo(formaPagamento.id, { percentualAcrescimo }).pipe(
      finalize(() => this.salvandoId.set(null))
    ).subscribe({
      next: (formaAtualizada) => {
        this.formasPagamento.update((formas) =>
          formas.map((forma) => forma.id === formaAtualizada.id ? formaAtualizada : forma)
        );
        this.percentuais.update((percentuais) => ({
          ...percentuais,
          [formaAtualizada.id]: formaAtualizada.percentualAcrescimo
        }));
        this.message.success('Percentual atualizado com sucesso.');
      },
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
  }

  protected houveAlteracao(formaPagamento: FormaPagamentoResponse): boolean {
    return this.normalizarPercentual(this.percentuais()[formaPagamento.id]) !==
      this.normalizarPercentual(formaPagamento.percentualAcrescimo);
  }

  protected tipoTexto(tipo: TipoFormaPagamento): string {
    const labels: Record<string, string> = {
      PIX: 'Pix',
      DINHEIRO: 'Dinheiro',
      CARTAO_DEBITO: 'Cartao de debito',
      CARTAO_CREDITO: 'Cartao de credito'
    };

    return labels[tipo] ?? tipo;
  }

  private carregarFormasPagamento(): void {
    this.carregando.set(true);

    this.formaPagamentoService.listarAtivas().pipe(
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: (formas) => {
        this.formasPagamento.set(formas);
        this.percentuais.set(
          formas.reduce<Record<number, number>>((acc, forma) => {
            acc[forma.id] = forma.percentualAcrescimo;
            return acc;
          }, {})
        );
      },
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
  }

  private normalizarPercentual(valor: number | null | undefined): number {
    return Number(Number(valor ?? 0).toFixed(2));
  }

  private extrairMensagemErro(error: HttpErrorResponse): string {
    const body = error.error;

    if (this.ehErroValidacao(body)) {
      return body.errors.map((erroCampo) => erroCampo.message).join(' ');
    }

    if (this.ehErroPadrao(body)) {
      return body.message || body.error || 'Nao foi possivel concluir a operacao.';
    }

    return 'Nao foi possivel concluir a operacao.';
  }

  private ehErroValidacao(value: unknown): value is ValidationError {
    return !!value && typeof value === 'object' && Array.isArray((value as ValidationError).errors);
  }

  private ehErroPadrao(value: unknown): value is StandardError {
    return !!value && typeof value === 'object' && 'message' in value;
  }
}
