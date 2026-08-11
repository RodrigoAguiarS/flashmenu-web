import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { PERMISSOES } from '../../../core/auth/permissoes';
import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { UnidadeRequest, UnidadeResponse } from '../../../core/models/unidade.model';
import { AuthService } from '../../../core/services/auth.service';
import { UnidadeService } from '../../../core/services/unidade.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-unidade-list',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    NzButtonModule,
    NzEmptyModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzPopconfirmModule,
    NzSwitchModule,
    NzTableModule,
    NzTagModule,
    NzTooltipModule,
    PageHeaderComponent
  ],
  templateUrl: './unidade-list.component.html',
  styleUrl: './unidade-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UnidadeListComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly unidadeService = inject(UnidadeService);
  private readonly message = inject(NzMessageService);

  protected readonly unidades = signal<UnidadeResponse[]>([]);
  protected readonly unidadeEditando = signal<UnidadeResponse | null>(null);
  protected readonly modalAberto = signal(false);
  protected readonly carregando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly excluindoId = signal<number | null>(null);
  protected readonly mensagemErro = signal<string | null>(null);
  protected readonly editando = computed(() => this.unidadeEditando() !== null);
  protected readonly tituloModal = computed(() => this.editando() ? 'Editar unidade' : 'Nova unidade');
  protected readonly podeCriar = computed(() => this.authService.possuiPermissao(PERMISSOES.UNIDADE_CRIAR));
  protected readonly podeEditar = computed(() => this.authService.possuiPermissao(PERMISSOES.UNIDADE_EDITAR));
  protected readonly podeExcluir = computed(() => this.authService.possuiPermissao(PERMISSOES.UNIDADE_DELETAR));

  protected readonly form = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), Validators.maxLength(80)]],
    ativo: [true]
  });

  ngOnInit(): void {
    this.carregarUnidades();
  }

  protected abrirCadastro(): void {
    this.unidadeEditando.set(null);
    this.mensagemErro.set(null);
    this.form.reset({ nome: '', slug: '', ativo: true });
    this.modalAberto.set(true);
  }

  protected editar(unidade: UnidadeResponse): void {
    this.unidadeEditando.set(unidade);
    this.mensagemErro.set(null);
    this.form.reset({
      nome: unidade.nome,
      slug: unidade.slug,
      ativo: unidade.ativo
    });
    this.modalAberto.set(true);
  }

  protected fecharModal(): void {
    if (this.salvando()) {
      return;
    }

    this.modalAberto.set(false);
    this.unidadeEditando.set(null);
    this.mensagemErro.set(null);
  }

  protected salvar(): void {
    this.mensagemErro.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const request = this.montarRequest();
    const unidade = this.unidadeEditando();
    const operacao$ = unidade
      ? this.unidadeService.atualizar(unidade.id, request)
      : this.unidadeService.cadastrar(request);

    this.salvando.set(true);
    operacao$.pipe(
      finalize(() => this.salvando.set(false))
    ).subscribe({
      next: () => {
        this.message.success(unidade ? 'Unidade atualizada.' : 'Unidade cadastrada.');
        this.fecharModal();
        this.carregarUnidades();
      },
      error: (error: HttpErrorResponse) => this.mensagemErro.set(this.extrairMensagemErro(error))
    });
  }

  protected excluir(unidade: UnidadeResponse): void {
    this.excluindoId.set(unidade.id);

    this.unidadeService.excluir(unidade.id).pipe(
      finalize(() => this.excluindoId.set(null))
    ).subscribe({
      next: () => {
        this.message.success('Unidade desativada ou removida.');
        this.carregarUnidades();
      },
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
  }

  protected copiarLink(unidade: UnidadeResponse): void {
    const link = this.linkPublico(unidade);

    if (!navigator.clipboard) {
      this.message.info(link);
      return;
    }

    navigator.clipboard.writeText(link)
      .then(() => this.message.success('Link do cardapio copiado.'))
      .catch(() => this.message.info(link));
  }

  protected linkPublico(unidade: UnidadeResponse): string {
    return `${window.location.origin}/cardapio/${unidade.slug}`;
  }

  protected statusColor(unidade: UnidadeResponse): string {
    return unidade.ativo ? 'success' : 'default';
  }

  protected statusTexto(unidade: UnidadeResponse): string {
    return unidade.ativo ? 'Ativa' : 'Inativa';
  }

  protected normalizarSlug(): void {
    const slug = this.form.controls.slug.value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

    this.form.controls.slug.setValue(slug, { emitEvent: false });
  }

  private carregarUnidades(): void {
    this.carregando.set(true);

    this.unidadeService.listar().pipe(
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: (unidades) => this.unidades.set(unidades),
      error: (error: HttpErrorResponse) => {
        this.unidades.set([]);
        this.message.error(this.extrairMensagemErro(error));
      }
    });
  }

  private montarRequest(): UnidadeRequest {
    const valor = this.form.getRawValue();
    return {
      nome: valor.nome.trim(),
      slug: valor.slug.trim(),
      ativo: valor.ativo
    };
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
