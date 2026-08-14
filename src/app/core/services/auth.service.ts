import { HttpClient } from '@angular/common/http';
import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ClienteCheckoutRequest, ClienteIdentificacaoResponse, LoginRequest, LoginResponse } from '../models/auth.model';
import { UsuarioResponse } from '../models/usuario.model';
import { PERMISSOES } from '../auth/permissoes';
import { PedidoNotificacaoVisualService } from './pedido-notificacao-visual.service';

const ACCESS_TOKEN_KEY = 'flashmenu_access_token';
const TOKEN_TYPE_KEY = 'flashmenu_token_type';
const USUARIO_KEY = 'flashmenu_usuario';
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly pedidoNotificacaoVisualService = inject(PedidoNotificacaoVisualService);
  private readonly usuarioAtual = signal<UsuarioResponse | null>(this.carregarUsuario());

  readonly usuarioAutenticado: Signal<UsuarioResponse | null> = computed(() => this.usuarioAtual());
  readonly perfilCliente = computed(() => this.ehPerfilCliente(this.usuarioAtual()));
  readonly permissoes = computed(() =>
    new Set(this.usuarioAtual()?.perfil?.permissoes.map((permissao) => permissao.authority) ?? [])
  );

  entrar(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, request).pipe(
      tap((response) => this.persistirSessao(response))
    );
  }

  buscarClientePorTelefoneUnidade(unidadeSlug: string, telefone: string): Observable<ClienteIdentificacaoResponse> {
    return this.http.get<ClienteIdentificacaoResponse>(
      `${environment.apiUrl}/auth/unidades/${encodeURIComponent(unidadeSlug)}/clientes/por-telefone`,
      {
        params: { telefone }
      }
    );
  }

  cadastrarClienteCheckoutUnidade(unidadeSlug: string, request: ClienteCheckoutRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${environment.apiUrl}/auth/unidades/${encodeURIComponent(unidadeSlug)}/clientes`,
      request
    ).pipe(
      tap((response) => this.persistirSessao(response))
    );
  }

  sair(): void {
    this.limparSessao();
    void this.router.navigate(['/login']);
  }

  encerrarSessaoExpirada(returnUrl?: string): void {
    this.limparSessao();
    void this.router.navigate(['/login'], {
      queryParams: returnUrl ? { returnUrl } : undefined
    });
  }

  limparSessao(): void {
    this.pedidoNotificacaoVisualService.desconectar();
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(TOKEN_TYPE_KEY);
    localStorage.removeItem(USUARIO_KEY);
    this.usuarioAtual.set(null);
  }

  usuarioLogado(): Observable<UsuarioResponse> {
    return this.http.get<UsuarioResponse>(`${environment.apiUrl}/auth/usuarioLogado`).pipe(
      tap((usuario) => {
        this.usuarioAtual.set(usuario);
        localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
      })
    );
  }

  estaAutenticado(): boolean {
    return !!this.obterToken();
  }

  obterToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  obterUsuarioAtual(): UsuarioResponse | null {
    return this.usuarioAtual();
  }

  ehCliente(): boolean {
    return this.perfilCliente();
  }

  atualizarUsuarioAtual(usuario: UsuarioResponse): void {
    this.usuarioAtual.set(usuario);
    localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
  }

  possuiPermissao(authority: string): boolean {
    const permissoes = this.permissoes();
    return this.possuiPermissaoAdministrativa(permissoes) || permissoes.has(authority);
  }

  possuiAlgumaPermissao(authorities: readonly string[]): boolean {
    if (authorities.length === 0) {
      return true;
    }

    const permissoes = this.permissoes();
    if (this.possuiPermissaoAdministrativa(permissoes)) {
      return true;
    }

    return authorities.some((authority) => permissoes.has(authority));
  }

  private possuiPermissaoAdministrativa(permissoes: ReadonlySet<string>): boolean {
    return permissoes.has(PERMISSOES.ADMIN) ||
      permissoes.has(PERMISSOES.ADMINISTRATIVO_CRIAR) ||
      permissoes.has(PERMISSOES.ADMINSTRATIVO_CRIAR);
  }

  private ehPerfilCliente(usuario: UsuarioResponse | null): boolean {
    return this.normalizarPerfil(usuario?.perfil?.descricao) === 'cliente';
  }

  private normalizarPerfil(descricao?: string | null): string {
    return (descricao ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private persistirSessao(response: LoginResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
    localStorage.setItem(TOKEN_TYPE_KEY, response.tokenType);
    localStorage.setItem(USUARIO_KEY, JSON.stringify(response.usuario));
    this.usuarioAtual.set(response.usuario);
  }

  private carregarUsuario(): UsuarioResponse | null {
    const storedUsuario = localStorage.getItem(USUARIO_KEY);

    if (!storedUsuario) {
      return null;
    }

    try {
      return JSON.parse(storedUsuario) as UsuarioResponse;
    } catch {
      localStorage.removeItem(USUARIO_KEY);
      return null;
    }
  }
}
