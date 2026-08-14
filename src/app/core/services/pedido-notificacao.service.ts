import { Injectable, OnDestroy } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable, Subject } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PedidoStatusNotificacao } from '../models/pedido-notificacao.model';

@Injectable({
  providedIn: 'root'
})
export class PedidoNotificacaoService implements OnDestroy {
  private client?: Client;
  private readonly subscriptions = new Map<string, StompSubscription>();
  private readonly destinos = new Set<string>();
  private readonly notificacaoSubject = new Subject<PedidoStatusNotificacao>();
  private accessToken: string | null = null;

  readonly notificacoes$: Observable<PedidoStatusNotificacao> = this.notificacaoSubject.asObservable();

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
