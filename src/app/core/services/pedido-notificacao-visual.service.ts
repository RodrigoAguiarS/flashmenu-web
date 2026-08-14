import { Injectable, OnDestroy } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { NzNotificationDataOptions, NzNotificationService } from 'ng-zorro-antd/notification';
import { Observable, Subject } from 'rxjs';
import SockJS from 'sockjs-client';

import { environment } from '../../../environments/environment';
import { EntregaResponse } from '../models/entrega.model';
import { PedidoStatusNotificacao } from '../models/pedido-notificacao.model';
import { PedidoResponse } from '../models/pedido.model';

interface PedidoNotificacaoContexto {
  pedido?: PedidoResponse | null;
  entrega?: EntregaResponse | null;
}

@Injectable({
  providedIn: 'root'
})
export class PedidoNotificacaoVisualService implements OnDestroy {
  private client?: Client;
  private readonly subscriptions = new Map<string, StompSubscription>();
  private readonly destinos = new Set<string>();
  private readonly notificacaoSubject = new Subject<PedidoStatusNotificacao>();
  private accessToken: string | null = null;

  readonly notificacoes$: Observable<PedidoStatusNotificacao> = this.notificacaoSubject.asObservable();

  constructor(private readonly notification: NzNotificationService) {}

  conectar(apiBaseUrl = environment.apiUrl, accessToken?: string | null): void {
    this.accessToken = accessToken ?? this.accessToken;

    if (this.client?.active) {
      return;
    }

    const tokenQuery = this.accessToken ? `?access_token=${encodeURIComponent(this.accessToken)}` : '';

    this.client = new Client({
      webSocketFactory: () => new SockJS(`${apiBaseUrl}/ws${tokenQuery}`),
      connectHeaders: this.criarHeadersAutenticacao(),
      reconnectDelay: 5000,
      onConnect: () => this.reassinarDestinos(),
      onWebSocketClose: () => this.subscriptions.clear(),
      onStompError: (frame) => console.error('Erro STOMP', frame)
    });

    this.client.activate();
  }

  ouvirPedido(pedidoId: number): void {
    this.subscribe(`/topic/pedidos/${pedidoId}`);
  }

  ouvirUnidadePedidos(unidadeId: number): void {
    this.subscribe(`/topic/unidades/${unidadeId}/pedidos`);
  }

  ouvirEntregador(entregadorId: number): void {
    this.subscribe(`/topic/entregadores/${entregadorId}/entregas`);
  }

  removerInscricao(destination: string): void {
    this.destinos.delete(destination);
    this.subscriptions.get(destination)?.unsubscribe();
    this.subscriptions.delete(destination);
  }

  limparInscricoes(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.subscriptions.clear();
    this.destinos.clear();
  }

  desconectar(): void {
    this.limparInscricoes();
    void this.client?.deactivate();
    this.client = undefined;
  }

  ngOnDestroy(): void {
    this.desconectar();
  }

  notificar(notificacao: PedidoStatusNotificacao, contexto: PedidoNotificacaoContexto = {}): void {
    const mobile = this.ehMobile();
    const options: NzNotificationDataOptions = {
      nzDuration: mobile ? 0 : 7000,
      nzPlacement: mobile ? 'bottomRight' : 'topRight'
    };

    this.notification.info(
      this.criarTitulo(notificacao, contexto),
      this.criarDescricao(notificacao, contexto),
      options
    );
  }

  private criarTitulo(notificacao: PedidoStatusNotificacao, contexto: PedidoNotificacaoContexto): string {
    const numeroPedido = this.numeroPedido(notificacao, contexto);
    return notificacao.mensagem ? `${notificacao.mensagem} - ${numeroPedido}` : `Atualizacao do ${numeroPedido}`;
  }

  private criarDescricao(notificacao: PedidoStatusNotificacao, contexto: PedidoNotificacaoContexto): string {
    const pedido = contexto.pedido;
    const entrega = contexto.entrega;
    const partes = [
      this.nomeCliente(pedido, entrega),
      this.nomeUnidade(pedido, entrega),
      notificacao.statusPedido ? `Pedido: ${this.statusPedidoTexto(notificacao.statusPedido)}` : null,
      notificacao.statusEntrega ? `Entrega: ${this.statusEntregaTexto(notificacao.statusEntrega)}` : null,
      notificacao.statusPagamento ? `Pagamento: ${this.statusPagamentoTexto(notificacao.statusPagamento)}` : null,
      this.nomeEntregador(pedido, entrega),
      notificacao.dataHora ? `Horario: ${this.formatarDataHora(notificacao.dataHora)}` : null
    ];

    return partes.filter((parte): parte is string => !!parte).join(' | ');
  }

  private numeroPedido(notificacao: PedidoStatusNotificacao, contexto: PedidoNotificacaoContexto): string {
    const pedidoId = contexto.pedido?.id ?? contexto.entrega?.numeroPedido ?? contexto.entrega?.pedidoId ?? notificacao.pedidoId;
    return `pedido #${pedidoId}`;
  }

  private nomeCliente(pedido: PedidoResponse | null | undefined, entrega: EntregaResponse | null | undefined): string | null {
    const nome = pedido?.cliente?.nome ?? entrega?.cliente?.nome;
    return nome ? `Cliente: ${nome}` : null;
  }

  private nomeUnidade(pedido: PedidoResponse | null | undefined, entrega: EntregaResponse | null | undefined): string | null {
    const nome = pedido?.unidade?.nome ?? entrega?.unidade?.nome;
    return nome ? `Unidade: ${nome}` : null;
  }

  private nomeEntregador(pedido: PedidoResponse | null | undefined, entrega: EntregaResponse | null | undefined): string | null {
    const nome = pedido?.entrega?.entregador?.nome ?? entrega?.entregador?.nome;
    return nome ? `Entregador: ${nome}` : null;
  }

  private statusPedidoTexto(status: string): string {
    const labels: Record<string, string> = {
      AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
      AGUARDANDO_CONFIRMACAO: 'Aguardando confirmacao',
      CONFIRMADO: 'Confirmado',
      CONCLUIDO: 'Concluido',
      CANCELADO: 'Cancelado'
    };

    return labels[status] ?? status;
  }

  private statusPagamentoTexto(status: string): string {
    const labels: Record<string, string> = {
      PENDENTE: 'Pendente',
      PAGO: 'Pago',
      CANCELADO: 'Cancelado',
      EXPIRADO: 'Expirado'
    };

    return labels[status] ?? status;
  }

  private statusEntregaTexto(status: string): string {
    const labels: Record<string, string> = {
      AGUARDANDO_ENTREGADOR: 'Aguardando entregador',
      ATRIBUIDA: 'Atribuida',
      ACEITA: 'Aceita',
      EM_ROTA: 'Em rota',
      ENTREGUE: 'Entregue',
      CANCELADA: 'Cancelada',
      RECUSADA: 'Recusada'
    };

    return labels[status] ?? status;
  }

  private formatarDataHora(dataHora: string): string {
    const data = new Date(dataHora);

    if (Number.isNaN(data.getTime())) {
      return dataHora;
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(data);
  }

  private ehMobile(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 699px)').matches;
  }

  private subscribe(destination: string): void {
    this.conectar();

    if (this.destinos.has(destination)) {
      return;
    }

    this.destinos.add(destination);

    if (this.client?.connected) {
      this.assinarDestino(destination);
    }
  }

  private reassinarDestinos(): void {
    this.subscriptions.clear();
    [...this.destinos].forEach((destination) => this.assinarDestino(destination));
  }

  private assinarDestino(destination: string): void {
    if (!this.client?.connected || this.subscriptions.has(destination)) {
      return;
    }

    const subscription = this.client.subscribe(destination, (message: IMessage) => this.receberMensagem(message));
    this.subscriptions.set(destination, subscription);
  }

  private criarHeadersAutenticacao(): Record<string, string> {
    return this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {};
  }

  private receberMensagem(message: IMessage): void {
    try {
      this.notificacaoSubject.next(JSON.parse(message.body) as PedidoStatusNotificacao);
    } catch (error) {
      console.error('Nao foi possivel processar a notificacao STOMP.', error);
    }
  }
}
