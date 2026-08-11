import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { CategoriaRequest } from '../../../core/models/categoria.model';
import { CategoriaService } from '../../../core/services/categoria.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-categoria-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NzAlertModule,
    NzButtonModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzSpinModule,
    PageHeaderComponent
  ],
  templateUrl: './categoria-form.component.html',
  styleUrl: './categoria-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoriaFormComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly categoriaService = inject(CategoriaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly message = inject(NzMessageService);

  protected readonly idCategoria = signal<number | null>(null);
  protected readonly carregando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly mensagemErro = signal<string | null>(null);
  protected readonly errosValidacao = signal<string[]>([]);
  protected readonly editando = computed(() => this.idCategoria() !== null);
  protected readonly titulo = computed(() => this.editando() ? 'Editar categoria' : 'Nova categoria');
  protected readonly textoBotao = computed(() => this.editando() ? 'Salvar alteracoes' : 'Cadastrar categoria');

  protected readonly formulario = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    descricao: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      return;
    }

    const idNumerico = Number(id);

    if (!Number.isInteger(idNumerico) || idNumerico <= 0) {
      this.message.error('Categoria invalida.');
      void this.router.navigate(['/categorias']);
      return;
    }

    this.idCategoria.set(idNumerico);
    this.carregarDadosEdicao(idNumerico);
  }

  enviar(): void {
    this.mensagemErro.set(null);
    this.errosValidacao.set([]);

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const id = this.idCategoria();
    this.salvando.set(true);

    const operacao$ = id
      ? this.categoriaService.atualizar(id, this.montarRequest())
      : this.categoriaService.cadastrar(this.montarRequest());

    operacao$.pipe(
      finalize(() => this.salvando.set(false))
    ).subscribe({
      next: () => {
        this.message.success(id ? 'Categoria atualizada com sucesso.' : 'Categoria cadastrada com sucesso.');
        void this.router.navigate(['/categorias']);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  private carregarDadosEdicao(id: number): void {
    this.carregando.set(true);

    this.categoriaService.buscarPorId(id).pipe(
      catchError((error: HttpErrorResponse) => {
        this.tratarErro(error);
        return of(null);
      }),
      finalize(() => this.carregando.set(false))
    ).subscribe((categoria) => {
      if (!categoria) {
        return;
      }

      this.formulario.patchValue({
        nome: categoria.nome,
        descricao: categoria.descricao
      });
    });
  }

  private montarRequest(): CategoriaRequest {
    const valor = this.formulario.getRawValue();

    return {
      nome: valor.nome.trim(),
      descricao: valor.descricao.trim()
    };
  }

  private tratarErro(error: HttpErrorResponse): void {
    const body = error.error;

    if (this.ehErroValidacao(body)) {
      this.mensagemErro.set(body.message || body.error || 'Erro de validacao.');
      this.errosValidacao.set(body.errors.map((erroCampo) => this.formatarErroCampo(erroCampo.fieldName, erroCampo.message)));
      return;
    }

    if (this.ehErroPadrao(body)) {
      this.mensagemErro.set(body.message || body.error || 'Nao foi possivel concluir a operacao.');
      return;
    }

    this.mensagemErro.set('Nao foi possivel concluir a operacao.');
  }

  private formatarErroCampo(fieldName: string, message: string): string {
    const labels: Record<string, string> = {
      nome: 'Nome',
      descricao: 'Descricao'
    };

    return `${labels[fieldName] ?? fieldName}: ${message}`;
  }

  private ehErroValidacao(value: unknown): value is ValidationError {
    return !!value && typeof value === 'object' && Array.isArray((value as ValidationError).errors);
  }

  private ehErroPadrao(value: unknown): value is StandardError {
    return !!value && typeof value === 'object' && 'message' in value;
  }
}
