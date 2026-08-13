import { CurrencyPipe, NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { ItemPedidoResponse, PedidoResponse, StatusPagamento, StatusPedido, TipoPedido } from '../../../core/models/pedido.model';
import { AuthService } from '../../../core/services/auth.service';
import { PedidoService } from '../../../core/services/pedido.service';
import { salvarArquivo } from '../../../core/utils/download-file';

type FiltroPedidos = 'TODOS' | 'EM_ANDAMENTO' | 'CONCLUIDOS';

@Component({
  selector: 'app-pedido-list',
  standalone: true,
  imports: [
    CurrencyPipe,
    NgTemplateOutlet,
    RouterLink,
    NzButtonModule,
    NzEmptyModule,
    NzIconModule,
    NzPaginationModule,
    NzSpinModule,
    NzTagModule
  ],
  templateUrl: './pedido-list.component.html',
  styleUrl: './pedido-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PedidoListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly pedidoService = inject(PedidoService);
  private readonly message = inject(NzMessageService);

  protected readonly carregando = signal(false);
  protected readonly pdfProcessandoId = signal<number | null>(null);
  protected readonly pedidos = signal<PedidoResponse[]>([]);
  protected readonly filtroSelecionado = signal<FiltroPedidos>('TODOS');
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly possuiPedidos = computed(() => this.pedidos().length > 0);
  protected readonly pedidosFiltrados = computed(() =>
    this.pedidos()
      .filter((pedido) => {
        const filtro = this.filtroSelecionado();

        if (filtro === 'EM_ANDAMENTO') {
          return this.pedidoEmAndamento(pedido);
        }

        if (filtro === 'CONCLUIDOS') {
          return this.pedidoConcluido(pedido);
        }

        return true;
      })
      .sort((a, b) => Number(this.pedidoEmAndamento(b)) - Number(this.pedidoEmAndamento(a)))
  );
  protected readonly possuiPedidosFiltrados = computed(() => this.pedidosFiltrados().length > 0);
  protected readonly pedidosEmAndamento = computed(() => this.pedidosFiltrados().filter((pedido) => this.pedidoEmAndamento(pedido)));
  protected readonly pedidosAnteriores = computed(() => this.pedidosFiltrados().filter((pedido) => !this.pedidoEmAndamento(pedido)));

  ngOnInit(): void {
    this.carregarPedidos();
  }

  protected selecionarFiltro(filtro: FiltroPedidos): void {
    this.filtroSelecionado.set(filtro);
  }

  protected statusTexto(status: StatusPedido): string {
    const labels: Record<string, string> = {
      AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
      AGUARDANDO_CONFIRMACAO: 'Aguardando confirmação',
      CONFIRMADO: 'Confirmado',
      CONCLUIDO: 'Concluido',
      CANCELADO: 'Cancelado'
    };

    return labels[status] ?? status;
  }

  protected statusPedidoTexto(pedido: PedidoResponse): string {
    return this.statusTexto(pedido.status);
  }

  protected statusPagamentoTexto(status: StatusPagamento | null | undefined): string {
    if (!status) {
      return 'Não informado';
    }

    const labels: Record<StatusPagamento, string> = {
      PENDENTE: 'Pendente',
      PAGO: 'Pago',
      EXPIRADO: 'Expirado',
      CANCELADO: 'Cancelado',
      ERRO: 'Erro'
    };

    return labels[status];
  }

  protected classeStatus(status: StatusPedido): string {
    const classes: Record<string, string> = {
      AGUARDANDO_PAGAMENTO: 'aguardando',
      AGUARDANDO_CONFIRMACAO: 'aguardando',
      CONFIRMADO: 'confirmado',
      CONCLUIDO: 'concluido',
      CANCELADO: 'cancelado'
    };

    return classes[status] ?? 'neutro';
  }

  protected classeStatusPedido(pedido: PedidoResponse): string {
    return this.classeStatus(pedido.status);
  }

  protected statusLinha(pedido: PedidoResponse): string {
    return `Pagamento: ${this.statusPagamentoTexto(pedido.pagamento?.status)}`;
  }

  protected classeStatusPagamento(pedido: PedidoResponse): string {
    const status = pedido.pagamento?.status;

    if (status === 'PAGO') {
      return 'confirmado';
    }

    if (status === 'CANCELADO' || status === 'EXPIRADO' || status === 'ERRO') {
      return 'cancelado';
    }

    return 'aguardando';
  }

  protected tipoTexto(tipo: TipoPedido | null): string {
    const labels: Record<string, string> = {
      DELIVERY: 'Delivery',
      PDV: 'Balcao'
    };

    return tipo ? labels[tipo] ?? tipo : 'Nao informado';
  }

  protected tipoIcone(tipo: TipoPedido | null): string {
    return tipo === 'PDV' ? 'shop' : 'environment';
  }

  protected nomeUnidade(pedido: PedidoResponse): string {
    return pedido.unidade?.nome ?? 'Unidade nao informada';
  }

  protected dataHumana(data: string): string {
    const valor = new Date(data);

    if (Number.isNaN(valor.getTime())) {
      return data;
    }

    const hoje = new Date();
    const ontem = new Date();
    ontem.setDate(hoje.getDate() - 1);
    const mesmoDia = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(valor);

    if (mesmoDia(valor, hoje)) {
      return `Hoje, ${hora}`;
    }

    if (mesmoDia(valor, ontem)) {
      return `Ontem, ${hora}`;
    }

    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      .format(valor)
      .replace('.', '');
  }

  protected quantidadeItensTexto(pedido: PedidoResponse): string {
    const totalItens = pedido.itens.reduce((total, item) => total + item.quantidade, 0);
    return `${totalItens} item${totalItens === 1 ? '' : 's'}`;
  }

  protected itensPreview(pedido: PedidoResponse): ItemPedidoResponse[] {
    return pedido.itens.slice(0, 2);
  }

  protected itensRestantes(pedido: PedidoResponse): number {
    return Math.max(pedido.itens.length - this.itensPreview(pedido).length, 0);
  }

  protected pedidoEmAndamento(pedido: PedidoResponse): boolean {
    return pedido.status !== 'CONCLUIDO' && pedido.status !== 'CANCELADO';
  }

  protected pedidoConcluido(pedido: PedidoResponse): boolean {
    return pedido.status === 'CONCLUIDO' || pedido.status === 'CANCELADO';
  }

  protected abrirDetalhe(id: number, event?: Event): void {
    event?.stopPropagation();
    void this.router.navigate(['/pedidos', id]);
  }

  protected alterarPagina(pageIndex: number): void {
    this.pageIndex.set(pageIndex);
    this.carregarPedidos();
  }

  protected exportarPdf(pedido: PedidoResponse, event: Event): void {
    event.stopPropagation();
    this.pdfProcessandoId.set(pedido.id);

    this.pedidoService.exportarPdf(pedido.id).pipe(
      finalize(() => this.pdfProcessandoId.set(null))
    ).subscribe({
      next: (arquivo) => salvarArquivo(arquivo, `pedido-${pedido.id}.pdf`),
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
  }

  private carregarPedidos(): void {
    const usuarioId = this.authService.usuarioAutenticado()?.id;

    if (!usuarioId) {
      this.pedidos.set([]);
      this.total.set(0);
      this.message.warning('Nao foi possivel identificar seu usuario.');
      return;
    }

    this.carregando.set(true);

    this.pedidoService.listarMeusPedidosPaginado(usuarioId, {
      page: this.pageIndex() - 1,
      size: this.pageSize(),
      sort: 'id'
    }).pipe(
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: (page) => {
        this.pedidos.set(page.content);
        this.total.set(page.totalElements);
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
      return body.message || body.error || 'Nao foi possivel carregar seus pedidos.';
    }

    return 'Nao foi possivel carregar seus pedidos.';
  }

  private ehErroValidacao(value: unknown): value is ValidationError {
    return !!value && typeof value === 'object' && Array.isArray((value as ValidationError).errors);
  }

  private ehErroPadrao(value: unknown): value is StandardError {
    return !!value && typeof value === 'object' && 'message' in value;
  }
}
