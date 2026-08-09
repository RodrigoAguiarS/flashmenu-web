import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { PERMISSOES } from '../../../core/auth/permissoes';
import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { PerfilResponse } from '../../../core/models/perfil.model';
import { UsuarioResponse } from '../../../core/models/usuario.model';
import { AuthService } from '../../../core/services/auth.service';
import { PerfilService } from '../../../core/services/perfil.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import { TelefonePipe } from '../../../shared/pipes/telefone.pipe';

type StatusFiltro = boolean | null;

@Component({
  selector: 'app-usuario-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TelefonePipe,
    NzButtonModule,
    NzDescriptionsModule,
    NzDrawerModule,
    NzEmptyModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzPaginationModule,
    NzPopconfirmModule,
    NzSelectModule,
    NzTableModule,
    NzTagModule,
    NzTooltipModule
  ],
  templateUrl: './usuario-list.component.html',
  styleUrl: './usuario-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsuarioListComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly perfilService = inject(PerfilService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly usuarios = signal<UsuarioResponse[]>([]);
  protected readonly perfis = signal<PerfilResponse[]>([]);
  protected readonly usuarioSelecionado = signal<UsuarioResponse | null>(null);
  protected readonly drawerAberto = signal(false);
  protected readonly carregando = signal(false);
  protected readonly carregandoPerfis = signal(false);
  protected readonly excluindoId = signal<number | null>(null);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly podeCriarUsuario = computed(() => this.authService.possuiPermissao(PERMISSOES.USUARIO_CRIAR));
  protected readonly podeEditarUsuario = computed(() => this.authService.possuiPermissao(PERMISSOES.USUARIO_EDITAR));
  protected readonly podeExcluirUsuario = computed(() => this.authService.possuiPermissao(PERMISSOES.USUARIO_DELETAR));

  protected readonly filtros = this.fb.group({
    nome: [''],
    email: [''],
    perfilId: this.fb.control<number | null>(null),
    ativo: this.fb.control<StatusFiltro>(null)
  });

  ngOnInit(): void {
    this.carregarPerfis();
    this.carregarUsuarios();

    this.filtros.valueChanges
      .pipe(
        debounceTime(350),
        distinctUntilChanged((anterior, atual) => JSON.stringify(anterior) === JSON.stringify(atual)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.pageIndex.set(1);
        this.carregarUsuarios();
      });
  }

  alterarPagina(pageIndex: number): void {
    this.pageIndex.set(pageIndex);
    this.carregarUsuarios();
  }

  alterarTamanhoPagina(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.pageIndex.set(1);
    this.carregarUsuarios();
  }

  limparFiltros(): void {
    this.filtros.reset({
      nome: '',
      email: '',
      perfilId: null,
      ativo: null
    });
  }

  visualizar(usuario: UsuarioResponse): void {
    this.usuarioSelecionado.set(usuario);
    this.drawerAberto.set(true);
  }

  fecharDrawer(): void {
    this.drawerAberto.set(false);
    this.usuarioSelecionado.set(null);
  }

  excluir(usuario: UsuarioResponse): void {
    this.excluindoId.set(usuario.id);

    this.usuarioService.excluir(usuario.id).pipe(
      finalize(() => this.excluindoId.set(null))
    ).subscribe({
      next: () => {
        this.message.success('Usuario excluido com sucesso.');
        this.carregarUsuarios();
      },
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
  }

  protected statusColor(ativo: boolean): string {
    return ativo ? 'success' : 'default';
  }

  protected statusTexto(ativo: boolean): string {
    return ativo ? 'Ativo' : 'Inativo';
  }

  private carregarUsuarios(): void {
    const filtros = this.filtros.getRawValue();
    this.carregando.set(true);

    this.usuarioService.listar({
      page: this.pageIndex() - 1,
      size: this.pageSize(),
      sort: 'id',
      nome: filtros.nome?.trim() || undefined,
      email: filtros.email?.trim() || undefined,
      perfilId: filtros.perfilId ?? undefined,
      ativo: filtros.ativo ?? undefined
    }).pipe(
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: (page) => {
        this.usuarios.set(page.content);
        this.total.set(page.totalElements);
      },
      error: (error: HttpErrorResponse) => {
        this.usuarios.set([]);
        this.total.set(0);
        this.message.error(this.extrairMensagemErro(error));
      }
    });
  }

  private carregarPerfis(): void {
    this.carregandoPerfis.set(true);

    this.perfilService.listar({ page: 0, size: 100, sort: 'descricao' }).pipe(
      finalize(() => this.carregandoPerfis.set(false))
    ).subscribe({
      next: (page) => this.perfis.set(page.content),
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
