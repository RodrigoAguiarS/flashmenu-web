import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of, switchMap } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { PerfilResponse } from '../../../core/models/perfil.model';
import { UsuarioRequest } from '../../../core/models/usuario.model';
import { PerfilService } from '../../../core/services/perfil.service';
import { UsuarioService } from '../../../core/services/usuario.service';

@Component({
  selector: 'app-usuario-form',
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
    NzSpinModule
  ],
  templateUrl: './usuario-form.component.html',
  styleUrl: './usuario-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsuarioFormComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly usuarioService = inject(UsuarioService);
  private readonly perfilService = inject(PerfilService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly message = inject(NzMessageService);

  protected readonly idUsuario = signal<number | null>(null);
  protected readonly carregando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly perfis = signal<PerfilResponse[]>([]);
  protected readonly mensagemErro = signal<string | null>(null);
  protected readonly errosValidacao = signal<string[]>([]);
  protected readonly senhaVisivel = signal(false);
  protected readonly novaSenhaVisivel = signal(false);
  protected readonly editando = computed(() => this.idUsuario() !== null);
  protected readonly titulo = computed(() => this.editando() ? 'Editar usuario' : 'Novo usuario');
  protected readonly textoBotao = computed(() => this.editando() ? 'Salvar alteracoes' : 'Cadastrar usuario');

  protected readonly formulario = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    login: ['', [Validators.required, Validators.email]],
    telefone: ['', [Validators.required, Validators.pattern(/^\(?[1-9]{2}\)?\s?(9?[0-9]{4})-?[0-9]{4}$/)]],
    idPerfil: this.fb.control<number | null>(null, [Validators.required]),
    senha: [''],
    novaSenha: ['']
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      const idNumerico = Number(id);

      if (!Number.isInteger(idNumerico) || idNumerico <= 0) {
        this.message.error('Usuario invalido.');
        void this.router.navigate(['/usuarios']);
        return;
      }

      this.idUsuario.set(idNumerico);
      this.formulario.controls.senha.clearValidators();
      this.formulario.controls.novaSenha.setValidators([Validators.minLength(6)]);
      this.carregarDadosEdicao(idNumerico);
      return;
    }

    this.formulario.controls.senha.setValidators([Validators.required, Validators.minLength(6)]);
    this.formulario.controls.novaSenha.clearValidators();
    this.carregarPerfis();
  }

  enviar(): void {
    this.mensagemErro.set(null);
    this.errosValidacao.set([]);
    this.formulario.controls.senha.updateValueAndValidity();
    this.formulario.controls.novaSenha.updateValueAndValidity();

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const id = this.idUsuario();
    const request = this.montarRequest();

    this.salvando.set(true);

    const operacao$ = id
      ? this.usuarioService.atualizar(id, request).pipe(
          switchMap((usuario) => {
            const novaSenha = this.formulario.controls.novaSenha.value.trim();

            if (!novaSenha) {
              return of(usuario);
            }

            return this.usuarioService.alterarSenha(id, { novaSenha }).pipe(switchMap(() => of(usuario)));
          })
        )
      : this.usuarioService.cadastrar(request);

    operacao$.pipe(
      finalize(() => this.salvando.set(false))
    ).subscribe({
      next: () => {
        this.message.success(id ? 'Usuario atualizado com sucesso.' : 'Usuario cadastrado com sucesso.');
        void this.router.navigate(['/usuarios']);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  alternarVisibilidadeSenha(): void {
    this.senhaVisivel.update((visivel) => !visivel);
  }

  alternarVisibilidadeNovaSenha(): void {
    this.novaSenhaVisivel.update((visivel) => !visivel);
  }

  private carregarPerfis(): void {
    this.carregando.set(true);

    this.perfilService.listar({ page: 0, size: 100, sort: 'descricao' }).pipe(
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: (page) => this.perfis.set(page.content),
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  private carregarDadosEdicao(id: number): void {
    this.carregando.set(true);

    forkJoin({
      usuario: this.usuarioService.buscarPorId(id),
      perfis: this.perfilService.listar({ page: 0, size: 100, sort: 'descricao' })
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

      this.perfis.set(resultado.perfis.content);
      this.formulario.patchValue({
        nome: resultado.usuario.nome,
        login: resultado.usuario.email,
        telefone: resultado.usuario.telefone || '',
        idPerfil: resultado.usuario.perfil?.id ?? null,
        senha: '',
        novaSenha: ''
      });
    });
  }

  private montarRequest(): UsuarioRequest {
    const valor = this.formulario.getRawValue();
    const request: UsuarioRequest = {
      nome: valor.nome.trim(),
      login: valor.login.trim(),
      telefone: valor.telefone.trim(),
      idPerfil: valor.idPerfil ?? 0
    };

    if (!this.editando()) {
      request.senha = valor.senha;
    }

    return request;
  }

  private tratarErro(error: HttpErrorResponse): void {
    const body = error.error;

    if (this.ehErroValidacao(body)) {
      this.mensagemErro.set(body.error || 'Erro de validacao.');
      this.errosValidacao.set(body.errors.map((erroCampo) => this.formatarErroCampo(erroCampo.fieldName, erroCampo.message)));
      return;
    }

    if (this.ehErroPadrao(body)) {
      this.mensagemErro.set(body.error || body.message || 'Nao foi possivel concluir a operacao.');
      return;
    }

    this.mensagemErro.set('Nao foi possivel concluir a operacao.');
  }

  private formatarErroCampo(fieldName: string, message: string): string {
    const labels: Record<string, string> = {
      nome: 'Nome',
      login: 'E-mail',
      email: 'E-mail',
      telefone: 'Telefone',
      senha: 'Senha',
      novaSenha: 'Nova senha',
      idPerfil: 'Perfil'
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

