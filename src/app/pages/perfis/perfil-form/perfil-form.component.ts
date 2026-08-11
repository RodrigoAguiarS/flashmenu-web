import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { PerfilRequest, PerfilUpdateRequest } from '../../../core/models/perfil.model';
import { PermissaoResponse } from '../../../core/models/permissao.model';
import { PerfilService } from '../../../core/services/perfil.service';
import { PermissaoService } from '../../../core/services/permissao.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-perfil-form',
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
    NzSelectModule,
    NzSpinModule,
    NzTagModule,
    PageHeaderComponent
  ],
  templateUrl: './perfil-form.component.html',
  styleUrl: './perfil-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerfilFormComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly perfilService = inject(PerfilService);
  private readonly permissaoService = inject(PermissaoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly message = inject(NzMessageService);

  protected readonly idPerfil = signal<number | null>(null);
  protected readonly carregando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly permissoes = signal<PermissaoResponse[]>([]);
  protected readonly mensagemErro = signal<string | null>(null);
  protected readonly errosValidacao = signal<string[]>([]);
  protected readonly editando = computed(() => this.idPerfil() !== null);
  protected readonly titulo = computed(() => this.editando() ? 'Editar perfil' : 'Novo perfil');
  protected readonly textoBotao = computed(() => this.editando() ? 'Salvar alteracoes' : 'Cadastrar perfil');

  protected readonly formulario = this.fb.group({
    descricao: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]],
    permissoes: this.fb.control<number[]>([], [Validators.required, Validators.minLength(1)])
  });

  protected obterAuthority(permissaoId: number): string {
    return this.permissoes().find((permissao) => permissao.id === permissaoId)?.authority ?? String(permissaoId);
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      const idNumerico = Number(id);

      if (!Number.isInteger(idNumerico) || idNumerico <= 0) {
        this.message.error('Perfil invalido.');
        void this.router.navigate(['/perfis']);
        return;
      }

      this.idPerfil.set(idNumerico);
      this.carregarDadosEdicao(idNumerico);
      return;
    }

    this.carregarPermissoes();
  }

  enviar(): void {
    this.mensagemErro.set(null);
    this.errosValidacao.set([]);

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const id = this.idPerfil();
    this.salvando.set(true);

    const operacao$ = id
      ? this.perfilService.atualizar(id, this.montarUpdateRequest())
      : this.perfilService.cadastrar(this.montarCreateRequest());

    operacao$.pipe(
      finalize(() => this.salvando.set(false))
    ).subscribe({
      next: () => {
        this.message.success(id ? 'Perfil atualizado com sucesso.' : 'Perfil cadastrado com sucesso.');
        void this.router.navigate(['/perfis']);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  private carregarPermissoes(): void {
    this.carregando.set(true);

    this.permissaoService.listar({ page: 0, size: 200, sort: 'authority' }).pipe(
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: (page) => this.permissoes.set(page.content),
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  private carregarDadosEdicao(id: number): void {
    this.carregando.set(true);

    forkJoin({
      perfil: this.perfilService.buscarPorId(id),
      permissoes: this.permissaoService.listar({ page: 0, size: 200, sort: 'authority' })
    }).pipe(
      catchError((error: HttpErrorResponse) => {
        this.tratarErro(error);
        return of(null);
      }),
      finalize(() => this.carregando.set(false))
    ).subscribe((resultado) => {
      if (!resultado) {
        return;
      }

      this.permissoes.set(resultado.permissoes.content);
      this.formulario.patchValue({
        descricao: resultado.perfil.descricao,
        permissoes: resultado.perfil.permissoes.map((permissao) => permissao.id)
      });
    });
  }

  private montarCreateRequest(): PerfilRequest {
    const valor = this.formulario.getRawValue();

    return {
      descricao: valor.descricao.trim(),
      permissoes: valor.permissoes
    };
  }

  private montarUpdateRequest(): PerfilUpdateRequest {
    const valor = this.formulario.getRawValue();

    return {
      descricao: valor.descricao.trim(),
      permissoes: valor.permissoes.map((id) => ({ id }))
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
      descricao: 'Descricao',
      permissoes: 'Permissoes'
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
