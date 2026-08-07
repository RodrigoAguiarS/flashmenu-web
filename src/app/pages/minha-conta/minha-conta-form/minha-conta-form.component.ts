import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { UsuarioRequest, UsuarioResponse } from '../../../core/models/usuario.model';
import { AuthService } from '../../../core/services/auth.service';
import { UsuarioService } from '../../../core/services/usuario.service';

const SENHA_NAO_ALTERADA = 'senha-nao-alterada';

@Component({
  selector: 'app-minha-conta-form',
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
    NzSpinModule
  ],
  templateUrl: './minha-conta-form.component.html',
  styleUrl: './minha-conta-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MinhaContaFormComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly message = inject(NzMessageService);

  protected readonly carregando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly alterandoSenha = signal(false);
  protected readonly usuario = signal<UsuarioResponse | null>(null);
  protected readonly mensagemErro = signal<string | null>(null);
  protected readonly errosValidacao = signal<string[]>([]);

  protected readonly formulario = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    login: ['', [Validators.required, Validators.email]],
    telefone: ['', [Validators.required, Validators.pattern(/^\(?[1-9]{2}\)?\s?(9?[0-9]{4})-?[0-9]{4}$/)]]
  });

  protected readonly formularioSenha = this.fb.group({
    novaSenha: ['', [Validators.required, Validators.minLength(6)]],
    confirmarSenha: ['', [Validators.required, Validators.minLength(6)]]
  });

  ngOnInit(): void {
    this.carregarUsuario();
  }

  enviar(): void {
    this.mensagemErro.set(null);
    this.errosValidacao.set([]);

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const usuario = this.usuario();
    const perfilId = usuario?.perfil?.id;

    if (!usuario || !perfilId) {
      this.mensagemErro.set('Nao foi possivel identificar seu perfil.');
      return;
    }

    this.salvando.set(true);

    this.usuarioService.atualizar(usuario.id, this.montarRequest(usuario)).pipe(
      finalize(() => this.salvando.set(false))
    ).subscribe({
      next: (usuarioAtualizado) => {
        this.usuario.set(usuarioAtualizado);
        this.authService.atualizarUsuarioAtual(usuarioAtualizado);
        this.message.success('Dados atualizados com sucesso.');
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  alterarSenha(): void {
    this.mensagemErro.set(null);
    this.errosValidacao.set([]);

    if (this.formularioSenha.invalid) {
      this.formularioSenha.markAllAsTouched();
      return;
    }

    const usuario = this.usuario();
    const valor = this.formularioSenha.getRawValue();

    if (!usuario) {
      this.mensagemErro.set('Nao foi possivel identificar seu usuario.');
      return;
    }

    if (valor.novaSenha !== valor.confirmarSenha) {
      this.mensagemErro.set('A confirmacao da senha nao confere.');
      return;
    }

    this.alterandoSenha.set(true);

    this.usuarioService.alterarSenha(usuario.id, { novaSenha: valor.novaSenha }).pipe(
      finalize(() => this.alterandoSenha.set(false))
    ).subscribe({
      next: () => {
        this.formularioSenha.reset();
        this.message.success('Senha alterada com sucesso.');
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  private carregarUsuario(): void {
    this.carregando.set(true);

    this.authService.usuarioLogado().pipe(
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: (usuario) => {
        this.usuario.set(usuario);
        this.formulario.patchValue({
          nome: usuario.nome,
          login: usuario.email,
          telefone: usuario.telefone ?? ''
        });
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  private montarRequest(usuario: UsuarioResponse): UsuarioRequest {
    const valor = this.formulario.getRawValue();

    return {
      nome: valor.nome.trim(),
      login: valor.login.trim(),
      telefone: valor.telefone.trim(),
      idPerfil: usuario.perfil?.id ?? 0,
      senha: SENHA_NAO_ALTERADA
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
      this.mensagemErro.set(body.message || body.error || 'Nao foi possivel atualizar seus dados.');
      return;
    }

    this.mensagemErro.set('Nao foi possivel atualizar seus dados.');
  }

  private formatarErroCampo(fieldName: string, message: string): string {
    const labels: Record<string, string> = {
      nome: 'Nome',
      login: 'E-mail',
      email: 'E-mail',
      telefone: 'Telefone',
      senha: 'Senha',
      novaSenha: 'Nova senha',
      confirmarSenha: 'Confirmar senha'
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
