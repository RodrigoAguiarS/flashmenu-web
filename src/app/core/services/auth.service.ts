import { HttpClient } from '@angular/common/http';
import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ClienteCheckoutRequest, ClienteIdentificacaoResponse, LoginRequest, LoginResponse } from '../models/auth.model';
import { UsuarioResponse } from '../models/usuario.model';
import { PERFIS, PERMISSOES, PERMISSOES_ROTAS, PermissaoAuthority } from '../auth/permissoes';
import { PedidoNotificacaoVisualService } from './pedido-notificacao-visual.service';

const ACCESS_TOKEN_KEY = 'flashmenu_access_token';
const TOKEN_TYPE_KEY = 'flashmenu_token_type';
const USUARIO_KEY = 'flashmenu_usuario';

interface RotaInicial {
  rota: string;
  permissoes?: readonly PermissaoAuthority[];
  perfis?: readonly string[];
}

interface RotaProtegida {
  prefixo: string;
  permissoes?: readonly PermissaoAuthority[];
  perfis?: readonly string[];
}

const ROTA_SEGURA_AUTENTICADA = '/minha-conta';

const ROTAS_INICIAIS: readonly RotaInicial[] = [
  { rota: '/dashboard', permissoes: PERMISSOES_ROTAS.DASHBOARD },
  { rota: '/pdv', permissoes: PERMISSOES_ROTAS.PDV },
  { rota: '/pedidos/gerenciar', permissoes: PERMISSOES_ROTAS.GERENCIAR_PEDIDOS },
  { rota: '/minhas-entregas', perfis: [PERFIS.ENTREGADOR], permissoes: PERMISSOES_ROTAS.MINHAS_ENTREGAS },
  { rota: '/entregas', permissoes: PERMISSOES_ROTAS.ENTREGAS },
  { rota: '/produtos', permissoes: PERMISSOES_ROTAS.PRODUTOS },
  { rota: '/administrativo', permissoes: PERMISSOES_ROTAS.ADMINISTRATIVO },
  { rota: '/pedidos', permissoes: PERMISSOES_ROTAS.MEUS_PEDIDOS }
];

const ROTAS_PROTEGIDAS: readonly RotaProtegida[] = [
  { prefixo: '/catalogo', perfis: [PERFIS.CLIENTE] },
  { prefixo: '/pedido/sucesso' },
  { prefixo: '/pdv', permissoes: PERMISSOES_ROTAS.PDV },
  { prefixo: '/pedidos/gerenciar', permissoes: PERMISSOES_ROTAS.GERENCIAR_PEDIDOS },
  { prefixo: '/pedidos', permissoes: PERMISSOES_ROTAS.MEUS_PEDIDOS },
  { prefixo: '/entregas', permissoes: PERMISSOES_ROTAS.ENTREGAS },
  { prefixo: '/minhas-entregas', perfis: [PERFIS.ENTREGADOR], permissoes: PERMISSOES_ROTAS.MINHAS_ENTREGAS },
  { prefixo: '/minha-conta' },
  { prefixo: '/administrativo', permissoes: PERMISSOES_ROTAS.ADMINISTRATIVO },
  { prefixo: '/produtos/novo', permissoes: PERMISSOES_ROTAS.PRODUTO_CRIAR },
  { prefixo: '/produtos', permissoes: PERMISSOES_ROTAS.PRODUTOS },
  { prefixo: '/categorias/novo', permissoes: PERMISSOES_ROTAS.CATEGORIA_CRIAR },
  { prefixo: '/categorias', permissoes: PERMISSOES_ROTAS.CATEGORIAS },
  { prefixo: '/movimentacoes', permissoes: PERMISSOES_ROTAS.MOVIMENTACOES },
  { prefixo: '/dashboard', permissoes: PERMISSOES_ROTAS.DASHBOARD },
  { prefixo: '/usuarios/novo', permissoes: PERMISSOES_ROTAS.USUARIO_CRIAR },
  { prefixo: '/usuarios', permissoes: PERMISSOES_ROTAS.USUARIOS },
  { prefixo: '/perfis/novo', permissoes: PERMISSOES_ROTAS.PERFIL_CRIAR },
  { prefixo: '/perfis', permissoes: PERMISSOES_ROTAS.PERFIS },
  { prefixo: '/permissoes', permissoes: PERMISSOES_ROTAS.PERMISSOES },
  { prefixo: '/formas-pagamento', permissoes: PERMISSOES_ROTAS.FORMAS_PAGAMENTO },
  { prefixo: '/configuracao-comercial', permissoes: PERMISSOES_ROTAS.CONFIGURACAO_COMERCIAL },
  { prefixo: '/unidades/novo', permissoes: PERMISSOES_ROTAS.UNIDADE_CRIAR },
  { prefixo: '/unidades', permissoes: PERMISSOES_ROTAS.UNIDADES },
  { prefixo: '/empresa', permissoes: PERMISSOES_ROTAS.EMPRESA }
];

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
  readonly perfilEntregador = computed(() => this.ehPerfilEntregador(this.usuarioAtual()));
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

  obterRotaInicial(): string {
    if (this.ehCliente()) {
      return '/catalogo';
    }

    const rotaInicial = ROTAS_INICIAIS.find((rota) => this.podeAcessarRota(rota));

    return rotaInicial?.rota ?? ROTA_SEGURA_AUTENTICADA;
  }

  obterUrlAutorizadaAposLogin(returnUrl: string | null): string {
    if (!returnUrl) {
      return this.obterRotaInicial();
    }

    const urlInterna = this.normalizarUrlInterna(returnUrl);

    if (!urlInterna) {
      return this.obterRotaInicial();
    }

    return this.podeAcessarUrl(urlInterna) ? urlInterna : this.obterRotaInicial();
  }

  ehCliente(): boolean {
    return this.perfilCliente();
  }

  ehEntregador(): boolean {
    return this.perfilEntregador();
  }

  possuiAlgumPerfil(perfis: readonly string[]): boolean {
    const perfilAtual = this.normalizarPerfil(this.usuarioAtual()?.perfil?.descricao);
    return perfis.some((perfil) => this.normalizarPerfil(perfil) === perfilAtual);
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

  private podeAcessarUrl(url: string): boolean {
    const caminho = url.split(/[?#]/)[0] || '/';
    const rotaProtegida = ROTAS_PROTEGIDAS
      .filter((rota) => this.caminhoCorrespondeAoPrefixo(caminho, rota.prefixo))
      .sort((a, b) => b.prefixo.length - a.prefixo.length)[0];

    return rotaProtegida ? this.podeAcessarRota(rotaProtegida) : false;
  }

  private podeAcessarRota(rota: RotaInicial | RotaProtegida): boolean {
    if (rota.perfis && !this.possuiAlgumPerfil(rota.perfis)) {
      return false;
    }

    if (rota.permissoes && !this.possuiAlgumaPermissao(rota.permissoes)) {
      return false;
    }

    return true;
  }

  private caminhoCorrespondeAoPrefixo(caminho: string, prefixo: string): boolean {
    return caminho === prefixo || caminho.startsWith(`${prefixo}/`);
  }

  private normalizarUrlInterna(returnUrl: string): string | null {
    if (!returnUrl.startsWith('/') || returnUrl.startsWith('//')) {
      return null;
    }

    try {
      const url = new URL(returnUrl, window.location.origin);
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return null;
    }
  }

  private ehPerfilCliente(usuario: UsuarioResponse | null): boolean {
    return this.normalizarPerfil(usuario?.perfil?.descricao) === PERFIS.CLIENTE;
  }

  private ehPerfilEntregador(usuario: UsuarioResponse | null): boolean {
    return this.normalizarPerfil(usuario?.perfil?.descricao) === PERFIS.ENTREGADOR;
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
