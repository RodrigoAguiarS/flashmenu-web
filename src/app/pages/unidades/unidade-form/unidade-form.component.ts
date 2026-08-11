import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, map, of } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { UnidadeRequest } from '../../../core/models/unidade.model';
import { UnidadeService } from '../../../core/services/unidade.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-unidade-form',
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
    NzSwitchModule,
    PageHeaderComponent
  ],
  templateUrl: './unidade-form.component.html',
  styleUrl: './unidade-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UnidadeFormComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly unidadeService = inject(UnidadeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly message = inject(NzMessageService);

  protected readonly idUnidade = signal<number | null>(null);
  protected readonly carregando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly mensagemErro = signal<string | null>(null);
  protected readonly errosValidacao = signal<string[]>([]);
  protected readonly editando = computed(() => this.idUnidade() !== null);
  protected readonly titulo = computed(() => this.editando() ? 'Editar unidade' : 'Nova unidade');
  protected readonly textoBotao = computed(() => this.editando() ? 'Salvar alteracoes' : 'Cadastrar unidade');
  protected readonly linkPreview = computed(() => {
    const slug = this.formulario.controls.slug.value.trim();
    return slug ? `${window.location.origin}/loja/${slug}` : `${window.location.origin}/loja/slug-da-unidade`;
  });

  protected readonly formulario = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), Validators.maxLength(80)]],
    ativo: [true]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      return;
    }

    const idNumerico = Number(id);

    if (!Number.isInteger(idNumerico) || idNumerico <= 0) {
      this.message.error('Unidade invalida.');
      void this.router.navigate(['/unidades']);
      return;
    }

    this.idUnidade.set(idNumerico);
    this.carregarDadosEdicao(idNumerico);
  }

  protected enviar(): void {
    this.mensagemErro.set(null);
    this.errosValidacao.set([]);
    this.normalizarSlug();

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const id = this.idUnidade();
    this.salvando.set(true);

    const operacao$ = id
      ? this.unidadeService.atualizar(id, this.montarRequest())
      : this.unidadeService.cadastrar(this.montarRequest());

    operacao$.pipe(
      finalize(() => this.salvando.set(false))
    ).subscribe({
      next: () => {
        this.message.success(id ? 'Unidade atualizada com sucesso.' : 'Unidade cadastrada com sucesso.');
        void this.router.navigate(['/unidades']);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  protected normalizarSlug(): void {
    const slug = this.formulario.controls.slug.value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

    this.formulario.controls.slug.setValue(slug, { emitEvent: false });
  }

  private carregarDadosEdicao(id: number): void {
    this.carregando.set(true);

    this.unidadeService.listar().pipe(
      map((unidades) => unidades.find((unidade) => unidade.id === id) ?? null),
      catchError((error: HttpErrorResponse) => {
        this.tratarErro(error);
        return of(null);
      }),
      finalize(() => this.carregando.set(false))
    ).subscribe((unidade) => {
      if (!unidade) {
        this.message.error('Unidade nao encontrada.');
        void this.router.navigate(['/unidades']);
        return;
      }

      this.formulario.patchValue({
        nome: unidade.nome,
        slug: unidade.slug,
        ativo: unidade.ativo
      });
    });
  }

  private montarRequest(): UnidadeRequest {
    const valor = this.formulario.getRawValue();

    return {
      nome: valor.nome.trim(),
      slug: valor.slug.trim(),
      ativo: valor.ativo
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
      slug: 'Slug',
      ativo: 'Ativo'
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
