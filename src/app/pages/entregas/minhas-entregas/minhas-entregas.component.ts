import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { PERMISSOES } from '../../../core/auth/permissoes';
import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { EntregaResponse, StatusEntrega } from '../../../core/models/entrega.model';
import { AuthService } from '../../../core/services/auth.service';
import { EntregaService } from '../../../core/services/entrega.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { criarOpcoesTamanhoPagina } from '../../../shared/utils/pagination.util';

type StatusFiltroEntrega = StatusEntrega | null;

@Component({
  selector: 'app-minhas-entregas',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    NzButtonModule,
    NzEmptyModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzPaginationModule,
    NzPopconfirmModule,
    NzSpinModule,
    NzTagModule,
    PageHeaderComponent
  ],
  templateUrl: './minhas-entregas.component.html',
  styleUrl: './minhas-entregas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MinhasEntregasComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly entregaService = inject(EntregaService);
  private readonly message = inject(NzMessageService);

  protected readonly entregas = signal<EntregaResponse[]>([]);
  protected readonly statusSelecionado = signal<StatusFiltroEntrega>(null);
  protected readonly entregaRecusa = signal<EntregaResponse | null>(null);
  protected readonly carregando = signal(false);
  protected readonly processandoId = signal<number | null>(null);
  protected readonly modalRecusaAberto = signal(false);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly possuiEntregas = computed(() => this.entregas().length > 0);
  protected readonly pageSizeOptions = computed(() => criarOpcoesTamanhoPagina(this.total()));
  protected readonly podeAceitar = computed(() => this.authService.possuiPermissao(PERMISSOES.ENTREGA_ACEITAR));
  protected readonly podeRecusar = computed(() => this.authService.possuiPermissao(PERMISSOES.ENTREGA_RECUSAR));
  protected readonly podeIniciar = computed(() => this.authService.possuiPermissao(PERMISSOES.ENTREGA_INICIAR));
  protected readonly podeConcluir = computed(() => this.authService.possuiPermissao(PERMISSOES.ENTREGA_CONCLUIR));
  protected readonly statusFiltros: Array<{ label: string; status: StatusFiltroEntrega }> = [
    { label: 'Todas', status: null },
    { label: 'Atribuidas', status: 'ATRIBUIDA' },
    { label: 'Aceitas', status: 'ACEITA' },
    { label: 'Em rota', status: 'EM_ROTA' },
    { label: 'Entregues', status: 'ENTREGUE' },
    { label: 'Recusadas', status: 'RECUSADA' }
  ];

  protected readonly recusaForm = this.fb.group({
    observacao: ['']
  });

  ngOnInit(): void {
    this.carregarEntregas();
  }

  protected selecionarStatus(status: StatusFiltroEntrega): void {
    this.statusSelecionado.set(status);
    this.pageIndex.set(1);
    this.carregarEntregas();
  }

  protected filtroAtivo(status: StatusFiltroEntrega): boolean {
    return this.statusSelecionado() === status;
  }

  protected alterarPagina(pageIndex: number): void {
    this.pageIndex.set(pageIndex);
    this.carregarEntregas();
  }

  protected alterarTamanhoPagina(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.pageIndex.set(1);
    this.carregarEntregas();
  }

  protected aceitar(entrega: EntregaResponse): void {
    if (!this.podeAceitarEntrega(entrega)) {
      return;
    }

    this.executarAcao(entrega.id, 'Entrega aceita com sucesso.', () => this.entregaService.aceitar(entrega.id));
  }

  protected abrirRecusa(entrega: EntregaResponse): void {
    if (!this.podeRecusarEntrega(entrega)) {
      return;
    }

    this.entregaRecusa.set(entrega);
    this.recusaForm.reset({ observacao: '' });
    this.modalRecusaAberto.set(true);
  }

  protected fecharRecusa(): void {
    this.modalRecusaAberto.set(false);
    this.entregaRecusa.set(null);
    this.recusaForm.reset({ observacao: '' });
  }

  protected confirmarRecusa(): void {
    const entrega = this.entregaRecusa();

    if (!entrega) {
      return;
    }

    const observacao = this.recusaForm.controls.observacao.value.trim();

    this.executarAcao(entrega.id, 'Entrega recusada.', () =>
      this.entregaService.recusar(entrega.id, { observacao: observacao || null })
    );
    this.fecharRecusa();
  }

  protected iniciar(entrega: EntregaResponse): void {
    if (!this.podeIniciarEntrega(entrega)) {
      return;
    }

    this.executarAcao(entrega.id, 'Entrega iniciada.', () => this.entregaService.iniciar(entrega.id));
  }

  protected concluir(entrega: EntregaResponse): void {
    if (!this.podeConcluirEntrega(entrega)) {
      return;
    }

    this.executarAcao(entrega.id, 'Entrega concluida.', () => this.entregaService.concluir(entrega.id));
  }

  protected podeAceitarEntrega(entrega: EntregaResponse): boolean {
    return this.podeAceitar() && entrega.status === 'ATRIBUIDA';
  }

  protected podeRecusarEntrega(entrega: EntregaResponse): boolean {
    return this.podeRecusar() && entrega.status === 'ATRIBUIDA';
  }

  protected podeIniciarEntrega(entrega: EntregaResponse): boolean {
    return this.podeIniciar() && entrega.status === 'ACEITA';
  }

  protected podeConcluirEntrega(entrega: EntregaResponse): boolean {
    return this.podeConcluir() && entrega.status === 'EM_ROTA';
  }

  protected numeroPedido(entrega: EntregaResponse): number | string {
    return entrega.numeroPedido ?? entrega.pedidoId ?? entrega.pedido?.id ?? '-';
  }

  protected clienteNome(entrega: EntregaResponse): string {
    const pedidoCliente = entrega.pedido && 'cliente' in entrega.pedido ? entrega.pedido.cliente?.nome : null;
    return entrega.cliente?.nome ?? pedidoCliente ?? 'Nao informado';
  }

  protected enderecoTexto(entrega: EntregaResponse): string {
    const enderecoPedido = entrega.pedido && 'enderecoEntrega' in entrega.pedido ? entrega.pedido.enderecoEntrega : null;
    const endereco = entrega.enderecoEntrega ?? enderecoPedido;

    if (!endereco) {
      return 'Nao informado';
    }

    const complemento = endereco.complemento ? ` - ${endereco.complemento}` : '';
    return `${endereco.logradouro}, ${endereco.numero}${complemento} - ${endereco.bairro}, ${endereco.cidade}/${endereco.estado}`;
  }

  protected statusEntregaTexto(status: StatusEntrega): string {
    const labels: Record<StatusEntrega, string> = {
      CRIADA: 'Criada',
      ATRIBUIDA: 'Atribuida',
      ACEITA: 'Aceita',
      EM_ROTA: 'Em rota',
      ENTREGUE: 'Entregue',
      RECUSADA: 'Recusada',
      CANCELADA: 'Cancelada'
    };

    return labels[status] ?? status;
  }

  protected corStatusEntrega(status: StatusEntrega): string {
    const cores: Record<StatusEntrega, string> = {
      CRIADA: 'default',
      ATRIBUIDA: 'processing',
      ACEITA: 'blue',
      EM_ROTA: 'warning',
      ENTREGUE: 'success',
      RECUSADA: 'error',
      CANCELADA: 'error'
    };

    return cores[status] ?? 'default';
  }

  private carregarEntregas(): void {
    this.carregando.set(true);

    this.entregaService.listarMinhas({
      page: this.pageIndex() - 1,
      size: this.pageSize(),
      sort: 'id',
      status: this.statusSelecionado() ?? undefined
    }).pipe(
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: (page) => {
        this.entregas.set(page.content);
        this.total.set(page.totalElements);
      },
      error: (error: HttpErrorResponse) => {
        this.entregas.set([]);
        this.total.set(0);
        this.message.error(this.extrairMensagemErro(error));
      }
    });
  }

  private executarAcao(entregaId: number, mensagemSucesso: string, operacao: () => ReturnType<EntregaService['aceitar']>): void {
    this.processandoId.set(entregaId);

    operacao().pipe(
      finalize(() => this.processandoId.set(null))
    ).subscribe({
      next: (entregaAtualizada) => {
        this.entregas.update((entregas) =>
          entregas.map((entrega) => entrega.id === entregaAtualizada.id ? entregaAtualizada : entrega)
        );
        this.message.success(mensagemSucesso);
      },
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
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
