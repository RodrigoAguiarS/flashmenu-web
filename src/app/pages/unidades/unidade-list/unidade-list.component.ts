import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { PERMISSOES } from '../../../core/auth/permissoes';
import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { UnidadeResponse } from '../../../core/models/unidade.model';
import { AuthService } from '../../../core/services/auth.service';
import { UnidadeService } from '../../../core/services/unidade.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-unidade-list',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    NzButtonModule,
    NzEmptyModule,
    NzIconModule,
    NzPopconfirmModule,
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
  private readonly authService = inject(AuthService);
  private readonly unidadeService = inject(UnidadeService);
  private readonly message = inject(NzMessageService);

  protected readonly unidades = signal<UnidadeResponse[]>([]);
  protected readonly carregando = signal(false);
  protected readonly excluindoId = signal<number | null>(null);
  protected readonly podeCriar = computed(() => this.authService.possuiPermissao(PERMISSOES.UNIDADE_CRIAR));
  protected readonly podeEditar = computed(() => this.authService.possuiPermissao(PERMISSOES.UNIDADE_EDITAR));
  protected readonly podeExcluir = computed(() => this.authService.possuiPermissao(PERMISSOES.UNIDADE_DELETAR));

  ngOnInit(): void {
    this.carregarUnidades();
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
