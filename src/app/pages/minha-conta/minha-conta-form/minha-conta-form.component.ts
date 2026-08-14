import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, of, switchMap } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { EnderecoRequest, EnderecoResponse } from '../../../core/models/endereco.model';
import { UsuarioRequest, UsuarioResponse } from '../../../core/models/usuario.model';
import { AuthService } from '../../../core/services/auth.service';
import { EnderecoService } from '../../../core/services/endereco.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import { ViaCepService } from '../../../core/services/via-cep.service';
import { DocumentoMaskDirective } from '../../../shared/directives/documento-mask.directive';
import { TelefonePipe } from '../../../shared/pipes/telefone.pipe';

const SENHA_NAO_ALTERADA = 'senha-nao-alterada';
type SecaoConta = 'hub' | 'dados' | 'enderecos' | 'seguranca';

@Component({
  selector: 'app-minha-conta-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DocumentoMaskDirective,
    NzAlertModule,
    NzButtonModule,
    NzEmptyModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzSpinModule,
    NzSwitchModule,
    TelefonePipe
  ],
  templateUrl: './minha-conta-form.component.html',
  styleUrl: './minha-conta-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MinhaContaFormComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly enderecoService = inject(EnderecoService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly viaCepService = inject(ViaCepService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly carregando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly salvandoEndereco = signal(false);
  protected readonly definindoPrincipalId = signal<number | null>(null);
  protected readonly alterandoSenha = signal(false);
  protected readonly buscandoCep = signal(false);
  protected readonly formularioEnderecoAberto = signal(false);
  protected readonly usuario = signal<UsuarioResponse | null>(null);
  protected readonly enderecos = signal<EnderecoResponse[]>([]);
  protected readonly mensagemErro = signal<string | null>(null);
  protected readonly errosValidacao = signal<string[]>([]);
  protected readonly secaoAtual = signal<SecaoConta>('hub');

  protected readonly formulario = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    login: ['', [Validators.required, Validators.email]],
    telefone: ['', [Validators.required, Validators.pattern(/^\(?[1-9]{2}\)?\s?(9?[0-9]{4})-?[0-9]{4}$/)]]
  });

  protected readonly formularioSenha = this.fb.group({
    novaSenha: ['', [Validators.required, Validators.minLength(6)]],
    confirmarSenha: ['', [Validators.required, Validators.minLength(6)]]
  });

  protected readonly formularioEndereco = this.fb.group({
    cep: ['', [Validators.required, Validators.pattern(/^\d{5}-?\d{3}$/)]],
    logradouro: ['', [Validators.required, Validators.maxLength(150)]],
    numero: ['', [Validators.required, Validators.maxLength(20)]],
    complemento: ['', [Validators.maxLength(100)]],
    bairro: ['', [Validators.required, Validators.maxLength(100)]],
    cidade: ['', [Validators.required, Validators.maxLength(100)]],
    estado: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]],
    principal: [true]
  });

  ngOnInit(): void {
    this.observarCep();
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
        this.formulario.markAsPristine();
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

  cadastrarEndereco(): void {
    this.mensagemErro.set(null);
    this.errosValidacao.set([]);

    if (this.formularioEndereco.invalid) {
      this.formularioEndereco.markAllAsTouched();
      return;
    }

    const usuario = this.usuario();
    if (!usuario) {
      this.mensagemErro.set('Nao foi possivel identificar seu usuario.');
      return;
    }

    this.salvandoEndereco.set(true);

    this.enderecoService.criar(usuario.id, this.montarEnderecoRequest()).pipe(
      switchMap(() => this.enderecoService.listar(usuario.id)),
      finalize(() => this.salvandoEndereco.set(false))
    ).subscribe({
      next: (enderecos) => {
        this.enderecos.set(enderecos);
        this.formularioEnderecoAberto.set(false);
        this.formularioEndereco.reset({
          cep: '',
          logradouro: '',
          numero: '',
          complemento: '',
          bairro: '',
          cidade: '',
          estado: '',
          principal: true
        });
        this.message.success('Endereco cadastrado com sucesso.');
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  private carregarUsuario(): void {
    this.carregando.set(true);

    this.authService.usuarioLogado().pipe(
      switchMap((usuario) => {
        this.usuario.set(usuario);
        this.formulario.patchValue({
          nome: usuario.nome,
          login: usuario.email,
          telefone: usuario.telefone ?? ''
        });
        this.formulario.markAsPristine();

        return this.enderecoService.listar(usuario.id).pipe(
          catchError(() => of([])),
          map((enderecos) => ({ usuario, enderecos }))
        );
      }),
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: ({ usuario, enderecos }) => {
        this.usuario.set(usuario);
        this.enderecos.set(enderecos);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  protected formatarEndereco(endereco: EnderecoResponse): string {
    const complemento = endereco.complemento ? `, ${endereco.complemento}` : '';
    return `${endereco.logradouro}, ${endereco.numero}${complemento}`;
  }

  protected formatarCep(cep: string): string {
    const numeros = cep.replace(/\D/g, '');
    return numeros.length === 8 ? `${numeros.slice(0, 5)}-${numeros.slice(5)}` : cep;
  }

  protected abrirSecao(secao: SecaoConta): void {
    this.limparMensagens();
    this.secaoAtual.set(secao);
  }

  protected voltarHub(): void {
    this.limparMensagens();
    this.secaoAtual.set('hub');
  }

  protected iniciaisUsuario(): string {
    const nome = this.usuario()?.nome?.trim();

    if (!nome) {
      return 'FM';
    }

    return nome.split(/\s+/).slice(0, 2).map((parte) => parte[0]?.toUpperCase()).join('');
  }

  protected enderecoPrincipal(): EnderecoResponse | null {
    return this.enderecos().find((endereco) => endereco.principal) ?? this.enderecos()[0] ?? null;
  }

  protected resumoEnderecos(): string {
    const total = this.enderecos().length;
    return `${total} endereco${total === 1 ? '' : 's'} cadastrado${total === 1 ? '' : 's'}`;
  }

  protected sair(): void {
    this.authService.sair();
  }

  protected abrirFormularioEndereco(): void {
    this.formularioEnderecoAberto.set(true);
  }

  protected cancelarEndereco(): void {
    this.formularioEnderecoAberto.set(false);
    this.formularioEndereco.reset({
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      principal: false
    });
  }

  protected definirEnderecoPrincipal(endereco: EnderecoResponse): void {
    const usuario = this.usuario();

    if (!usuario || endereco.principal) {
      return;
    }

    this.mensagemErro.set(null);
    this.errosValidacao.set([]);
    this.definindoPrincipalId.set(endereco.id);

    this.enderecoService.definirPrincipal(usuario.id, endereco.id).pipe(
      switchMap(() => this.enderecoService.listar(usuario.id)),
      finalize(() => this.definindoPrincipalId.set(null))
    ).subscribe({
      next: (enderecos) => {
        this.enderecos.set(enderecos);
        this.message.success('Endereco principal atualizado.');
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  private observarCep(): void {
    this.formularioEndereco.controls.cep.valueChanges.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((cep) => {
      const cepNormalizado = cep.replace(/\D/g, '');

      if (cepNormalizado.length !== 8) {
        this.limparEnderecoViaCep();
        return;
      }

      this.buscarCep(cepNormalizado);
    });
  }

  private buscarCep(cep: string): void {
    this.buscandoCep.set(true);

    this.viaCepService.buscarPorCep(cep).pipe(
      finalize(() => this.buscandoCep.set(false))
    ).subscribe({
      next: (dados) => {
        if (dados.erro) {
          this.message.warning('CEP nao encontrado.');
          return;
        }

        this.formularioEndereco.patchValue({
          cep: dados.cep,
          logradouro: dados.logradouro,
          bairro: dados.bairro,
          cidade: dados.localidade,
          estado: dados.uf
        });
        this.formularioEndereco.controls.numero.markAsTouched();
      },
      error: () => this.message.error('Nao foi possivel buscar o CEP.')
    });
  }

  private limparEnderecoViaCep(): void {
    this.formularioEndereco.patchValue({
      logradouro: '',
      bairro: '',
      cidade: '',
      estado: ''
    }, { emitEvent: false });
  }

  private montarEnderecoRequest(): EnderecoRequest {
    const valor = this.formularioEndereco.getRawValue();

    return {
      cep: valor.cep.trim(),
      logradouro: valor.logradouro.trim(),
      numero: valor.numero.trim(),
      complemento: valor.complemento.trim() || null,
      bairro: valor.bairro.trim(),
      cidade: valor.cidade.trim(),
      estado: valor.estado.trim(),
      principal: valor.principal
    };
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

  private limparMensagens(): void {
    this.mensagemErro.set(null);
    this.errosValidacao.set([]);
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
      confirmarSenha: 'Confirmar senha',
      cep: 'CEP',
      logradouro: 'Logradouro',
      numero: 'Numero',
      complemento: 'Complemento',
      bairro: 'Bairro',
      cidade: 'Cidade',
      estado: 'UF'
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
