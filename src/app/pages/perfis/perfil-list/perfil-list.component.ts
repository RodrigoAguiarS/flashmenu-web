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
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { PERMISSOES } from '../../../core/auth/permissoes';
import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { PerfilResponse } from '../../../core/models/perfil.model';
import { AuthService } from '../../../core/services/auth.service';
import { PerfilService } from '../../../core/services/perfil.service';

@Component({
  selector: 'app-perfil-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NzButtonModule,
    NzDescriptionsModule,
    NzDrawerModule,
    NzEmptyModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzPopconfirmModule,
    NzTableModule,
    NzTagModule,
    NzTooltipModule
  ],
  templateUrl: './perfil-list.component.html',
  styleUrl: './perfil-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerfilListComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly perfilService = inject(PerfilService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly perfis = signal<PerfilResponse[]>([]);
  protected readonly perfilSelecionado = signal<PerfilResponse | null>(null);
  protected readonly drawerAberto = signal(false);
  protected readonly carregando = signal(false);
  protected readonly excluindoId = signal<number | null>(null);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly podeCriarPerfil = computed(() => this.authService.possuiPermissao(PERMISSOES.PERFIL_CRIAR));
  protected readonly podeEditarPerfil = computed(() => this.authService.possuiPermissao(PERMISSOES.PERFIL_EDITAR));
  protected readonly podeExcluirPerfil = computed(() => this.authService.possuiPermissao(PERMISSOES.PERFIL_DELETAR));

  protected readonly filtros = this.fb.group({
    descricao: ['']
  });

  ngOnInit(): void {
    this.carregarPerfis();

    this.filtros.valueChanges
      .pipe(
        debounceTime(350),
        distinctUntilChanged((anterior, atual) => JSON.stringify(anterior) === JSON.stringify(atual)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.pageIndex.set(1);
        this.carregarPerfis();
      });
  }

  alterarPagina(pageIndex: number): void {
    this.pageIndex.set(pageIndex);
    this.carregarPerfis();
  }

  alterarTamanhoPagina(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.pageIndex.set(1);
    this.carregarPerfis();
  }

  limparFiltros(): void {
    this.filtros.reset({
      descricao: ''
    });
  }

  visualizar(perfil: PerfilResponse): void {
    this.perfilSelecionado.set(perfil);
    this.drawerAberto.set(true);
  }

  fecharDrawer(): void {
    this.drawerAberto.set(false);
    this.perfilSelecionado.set(null);
  }

  excluir(perfil: PerfilResponse): void {
    this.excluindoId.set(perfil.id);

    this.perfilService.excluir(perfil.id).pipe(
      finalize(() => this.excluindoId.set(null))
    ).subscribe({
      next: () => {
        this.message.success('Perfil excluido com sucesso.');
        this.carregarPerfis();
      },
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
  }

  private carregarPerfis(): void {
    const filtros = this.filtros.getRawValue();
    this.carregando.set(true);

    this.perfilService.listar({
      page: this.pageIndex() - 1,
      size: this.pageSize(),
      sort: 'descricao',
      descricao: filtros.descricao?.trim() || undefined
    }).pipe(
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: (page) => {
        this.perfis.set(page.content);
        this.total.set(page.totalElements);
      },
      error: (error: HttpErrorResponse) => {
        this.perfis.set([]);
        this.total.set(0);
        this.message.error(this.extrairMensagemErro(error));
      }
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
