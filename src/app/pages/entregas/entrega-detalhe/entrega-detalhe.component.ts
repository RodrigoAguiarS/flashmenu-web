import { CurrencyPipe, DatePipe, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';

import { PERMISSOES } from '../../../core/auth/permissoes';
import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { EntregaResponse, StatusEntrega } from '../../../core/models/entrega.model';
import { TipoFormaPagamento } from '../../../core/models/forma-pagamento.model';
import { StatusPagamento } from '../../../core/models/pedido.model';
import { AuthService } from '../../../core/services/auth.service';
import { EntregaService } from '../../../core/services/entrega.service';

@Component({
  selector: 'app-entrega-detalhe',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    NzAlertModule,
    NzButtonModule,
    NzDrawerModule,
    NzEmptyModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzSkeletonModule,
    NzTagModule,
    NzTimelineModule
  ],
  templateUrl: './entrega-detalhe.component.html',
  styleUrl: './entrega-detalhe.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntregaDetalheComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly entregaService = inject(EntregaService);
  private readonly message = inject(NzMessageService);

  protected readonly entrega = signal<EntregaResponse | null>(null);
  protected readonly carregando = signal(false);
  protected readonly processando = signal(false);
  protected readonly erroCarregamento = signal<string | null>(null);
  protected readonly confirmarConclusaoAberto = signal(false);
  protected readonly confirmarRecusaAberto = signal(false);
  protected readonly online = signal(this.obterStatusOnline());
  protected readonly podeAceitar = computed(() => this.authService.possuiPermissao(PERMISSOES.ENTREGA_ACEITAR));
  protected readonly podeRecusar = computed(() => this.authService.possuiPermissao(PERMISSOES.ENTREGA_RECUSAR));
  protected readonly podeIniciar = computed(() => this.authService.possuiPermissao(PERMISSOES.ENTREGA_INICIAR));
  protected readonly podeConcluir = computed(() => this.authService.possuiPermissao(PERMISSOES.ENTREGA_CONCLUIR));

  protected readonly recusaForm = this.fb.group({
    observacao: ['']
  });

  private readonly marcarOnline = (): void => this.online.set(true);
  private readonly marcarOffline = (): void => this.online.set(false);

  ngOnInit(): void {
    window.addEventListener('online', this.marcarOnline);
    window.addEventListener('offline', this.marcarOffline);
    this.carregarEntrega();
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.marcarOnline);
    window.removeEventListener('offline', this.marcarOffline);
  }

  protected voltar(): void {
    this.location.back();
  }

  protected tentarNovamente(): void {
    this.carregarEntrega();
  }

  protected abrirRota(): void {
    const entrega = this.entrega();
    const endereco = entrega ? this.enderecoBusca(entrega) : null;

    if (!endereco) {
      this.message.warning('Endereco nao informado para esta entrega.');
      return;
    }

    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`, '_blank', 'noopener');
  }

  protected ligarCliente(): void {
    const telefone = this.entrega()?.cliente?.telefone;

    if (!telefone) {
      this.message.warning('Telefone nao informado para este cliente.');
      return;
    }

    window.location.href = `tel:${telefone}`;
  }

  protected aceitar(): void {
    const entrega = this.entrega();

    if (!entrega || !this.podeExecutarAcao()) {
      return;
    }

    this.executarAcao('Entrega aceita.', () => this.entregaService.aceitar(entrega.id));
  }

  protected iniciar(): void {
    const entrega = this.entrega();

    if (!entrega || !this.podeExecutarAcao()) {
      return;
    }

    this.executarAcao('Rota iniciada.', () => this.entregaService.iniciar(entrega.id));
  }

  protected abrirConfirmacaoConclusao(): void {
    if (this.podeExecutarAcao()) {
      this.confirmarConclusaoAberto.set(true);
    }
  }

  protected fecharConfirmacaoConclusao(): void {
    this.confirmarConclusaoAberto.set(false);
  }

  protected confirmarConclusao(): void {
    const entrega = this.entrega();

    if (!entrega || !this.podeExecutarAcao()) {
      return;
    }

    this.executarAcao('Entrega concluida.', () => this.entregaService.concluir(entrega.id));
    this.fecharConfirmacaoConclusao();
  }

  protected abrirRecusa(): void {
    if (this.podeExecutarAcao()) {
      this.recusaForm.reset({ observacao: '' });
      this.confirmarRecusaAberto.set(true);
    }
  }

  protected fecharRecusa(): void {
    this.confirmarRecusaAberto.set(false);
    this.recusaForm.reset({ observacao: '' });
  }

  protected confirmarRecusa(): void {
    const entrega = this.entrega();

    if (!entrega || !this.podeExecutarAcao()) {
      return;
    }

    const observacao = this.recusaForm.controls.observacao.value.trim();
    this.executarAcao('Entrega recusada.', () =>
      this.entregaService.recusar(entrega.id, { observacao: observacao || null })
    );
    this.fecharRecusa();
  }

  protected podeAceitarEntrega(entrega: EntregaResponse): boolean {
    return this.podeAceitar() && entrega.status === 'ATRIBUIDA';
  }

  protected podeRecusarEntrega(entrega: EntregaResponse): boolean {
    return this.podeRecusar() && (entrega.status === 'ATRIBUIDA' || entrega.status === 'ACEITA');
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

  protected enderecoLinhaPrincipal(entrega: EntregaResponse): string {
    const endereco = this.endereco(entrega);

    if (!endereco) {
      return 'Endereco nao informado';
    }

    return `${endereco.logradouro}, ${endereco.numero}`;
  }

  protected enderecoLinhaSecundaria(entrega: EntregaResponse): string {
    const endereco = this.endereco(entrega);

    if (!endereco) {
      return '';
    }

    const complemento = endereco.complemento ? `${endereco.complemento} · ` : '';
    const cep = endereco.cep ? ` · CEP ${endereco.cep}` : '';
    return `${complemento}${endereco.bairro} · ${endereco.cidade}/${endereco.estado}${cep}`;
  }

  protected tipoFormaPagamentoTexto(tipo: TipoFormaPagamento | null | undefined): string {
    const labels: Record<string, string> = {
      PIX: 'Pix',
      DINHEIRO: 'Dinheiro',
      CARTAO_DEBITO: 'Cartao',
      CARTAO_CREDITO: 'Cartao'
    };

    return tipo ? labels[tipo] ?? tipo : 'Nao informado';
  }

  protected entregaEmDinheiro(entrega: EntregaResponse): boolean {
    return entrega.tipoFormaPagamento === 'DINHEIRO';
  }

  protected valorRecebidoTexto(entrega: EntregaResponse): string {
    return entrega.valorRecebido !== null && entrega.valorRecebido !== undefined
      ? this.formatarMoeda(entrega.valorRecebido)
      : 'Nao informado';
  }

  protected trocoTexto(entrega: EntregaResponse): string {
    return entrega.troco !== null && entrega.troco !== undefined
      ? this.formatarMoeda(entrega.troco)
      : 'Nao informado';
  }

  protected statusPagamentoTexto(status: StatusPagamento | null | undefined): string {
    const labels: Record<StatusPagamento, string> = {
      PENDENTE: 'Pendente',
      PAGO: 'Pago',
      EXPIRADO: 'Expirado',
      CANCELADO: 'Cancelado',
      ERRO: 'Erro'
    };

    return status ? labels[status] : 'Nao informado';
  }

  protected corStatusPagamento(status: StatusPagamento | null | undefined): string {
    const cores: Record<StatusPagamento, string> = {
      PENDENTE: 'warning',
      PAGO: 'success',
      EXPIRADO: 'default',
      CANCELADO: 'error',
      ERRO: 'error'
    };

    return status ? cores[status] : 'default';
  }

  protected statusEntregaTexto(status: StatusEntrega): string {
    const labels: Record<StatusEntrega, string> = {
      AGUARDANDO_ENTREGADOR: 'Aguardando',
      ATRIBUIDA: 'Atribuida',
      ACEITA: 'Aceita',
      EM_ROTA: 'Em rota',
      ENTREGUE: 'Entregue',
      CANCELADA: 'Cancelada',
      RECUSADA: 'Recusada'
    };

    return labels[status] ?? status;
  }

  protected corStatusEntrega(status: StatusEntrega): string {
    const cores: Record<StatusEntrega, string> = {
      AGUARDANDO_ENTREGADOR: 'default',
      ATRIBUIDA: 'processing',
      ACEITA: 'blue',
      EM_ROTA: 'warning',
      ENTREGUE: 'success',
      CANCELADA: 'error',
      RECUSADA: 'error'
    };

    return cores[status] ?? 'default';
  }

  protected timeline(entrega: EntregaResponse): Array<{ titulo: string; data?: string | null; status: 'done' | 'current' | 'pending' }> {
    const items: Array<{ statusEntrega: StatusEntrega; titulo: string; data?: string | null }> = [
      { statusEntrega: 'ATRIBUIDA', titulo: 'Atribuida', data: entrega.atribuidoEm },
      { statusEntrega: 'ACEITA', titulo: 'Aceita', data: entrega.aceitoEm },
      { statusEntrega: 'EM_ROTA', titulo: 'Em rota', data: entrega.saiuParaEntregaEm },
      { statusEntrega: 'ENTREGUE', titulo: 'Entregue', data: entrega.entregueEm }
    ];

    return items.map((item) => ({
      titulo: item.titulo,
      data: item.data,
      status: this.statusTimeline(entrega.status, item.statusEntrega, !!item.data)
    }));
  }

  private carregarEntrega(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isFinite(id) || id <= 0) {
      this.erroCarregamento.set('Entrega invalida.');
      return;
    }

    if (!this.online()) {
      this.erroCarregamento.set('Voce esta offline. Verifique sua conexao e tente novamente.');
      return;
    }

    this.erroCarregamento.set(null);
    this.carregando.set(true);

    this.entregaService.buscarPorId(id).pipe(
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: (entrega) => this.entrega.set(entrega),
      error: (error: HttpErrorResponse) => this.erroCarregamento.set(this.extrairMensagemErro(error))
    });
  }

  private executarAcao(mensagemSucesso: string, operacao: () => ReturnType<EntregaService['aceitar']>): void {
    this.processando.set(true);

    operacao().pipe(
      finalize(() => this.processando.set(false))
    ).subscribe({
      next: (entregaAtualizada) => {
        this.entrega.set(entregaAtualizada);
        this.message.success(mensagemSucesso);
      },
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
  }

  private statusTimeline(statusAtual: StatusEntrega, statusItem: StatusEntrega, possuiData: boolean): 'done' | 'current' | 'pending' {
    if (statusAtual === statusItem) {
      return 'current';
    }

    return possuiData ? 'done' : 'pending';
  }

  private podeExecutarAcao(): boolean {
    if (!this.online()) {
      this.message.warning('Voce esta offline. A acao nao foi enviada.');
      return false;
    }

    return true;
  }

  private endereco(entrega: EntregaResponse): EntregaResponse['enderecoEntrega'] {
    const enderecoPedido = entrega.pedido && 'enderecoEntrega' in entrega.pedido ? entrega.pedido.enderecoEntrega : null;
    return entrega.enderecoEntrega ?? enderecoPedido ?? null;
  }

  private enderecoBusca(entrega: EntregaResponse): string | null {
    const endereco = this.endereco(entrega);

    if (!endereco) {
      return null;
    }

    const complemento = endereco.complemento ? ` ${endereco.complemento}` : '';
    return `${endereco.logradouro}, ${endereco.numero}${complemento}, ${endereco.bairro}, ${endereco.cidade}, ${endereco.estado}`;
  }

  private obterStatusOnline(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
  }

  private formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  private extrairMensagemErro(error: HttpErrorResponse): string {
    const body = error.error;

    if (this.ehErroValidacao(body)) {
      return body.errors.map((erroCampo) => erroCampo.message).join(' ');
    }

    if (this.ehErroPadrao(body)) {
      return body.message || body.error || 'Nao foi possivel carregar a entrega.';
    }

    return 'Nao foi possivel carregar a entrega.';
  }

  private ehErroValidacao(value: unknown): value is ValidationError {
    return !!value && typeof value === 'object' && Array.isArray((value as ValidationError).errors);
  }

  private ehErroPadrao(value: unknown): value is StandardError {
    return !!value && typeof value === 'object' && 'message' in value;
  }
}
