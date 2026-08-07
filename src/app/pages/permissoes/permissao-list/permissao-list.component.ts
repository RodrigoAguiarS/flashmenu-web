import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTableModule } from 'ng-zorro-antd/table';

import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { PermissaoResponse } from '../../../core/models/permissao.model';
import { PermissaoService } from '../../../core/services/permissao.service';

@Component({
  selector: 'app-permissao-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NzEmptyModule,
    NzFormModule,
    NzGridModule,
    NzInputModule,
    NzInputNumberModule,
    NzTableModule
  ],
  templateUrl: './permissao-list.component.html',
  styleUrl: './permissao-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PermissaoListComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly permissaoService = inject(PermissaoService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly permissoes = signal<PermissaoResponse[]>([]);
  protected readonly carregando = signal(false);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(10);

  protected readonly filtros = this.fb.group({
    codigo: this.fb.control<number | null>(null),
    authority: ['']
  });

  ngOnInit(): void {
    this.carregarPermissoes();

    this.filtros.valueChanges
      .pipe(
        debounceTime(350),
        distinctUntilChanged((anterior, atual) => JSON.stringify(anterior) === JSON.stringify(atual)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.pageIndex.set(1);
        this.carregarPermissoes();
      });
  }

  alterarPagina(pageIndex: number): void {
    this.pageIndex.set(pageIndex);
    this.carregarPermissoes();
  }

  alterarTamanhoPagina(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.pageIndex.set(1);
    this.carregarPermissoes();
  }

  limparFiltros(): void {
    this.filtros.reset({
      codigo: null,
      authority: ''
    });
  }

  private carregarPermissoes(): void {
    const filtros = this.filtros.getRawValue();
    this.carregando.set(true);

    this.permissaoService.listar({
      page: this.pageIndex() - 1,
      size: this.pageSize(),
      sort: 'authority',
      codigo: filtros.codigo ?? undefined,
      authority: filtros.authority?.trim() || undefined
    }).pipe(
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: (page) => {
        this.permissoes.set(page.content);
        this.total.set(page.totalElements);
      },
      error: (error: HttpErrorResponse) => {
        this.permissoes.set([]);
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
