import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize, map } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzStepsModule } from 'ng-zorro-antd/steps';

import { StandardError, ValidationError } from '../../../../core/models/api-error.model';
import { ClienteCheckoutRequest } from '../../../../core/models/auth.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ViaCepService } from '../../../../core/services/via-cep.service';
import { DocumentoMaskDirective } from '../../../../shared/directives/documento-mask.directive';

@Component({
  selector: 'app-identificacao-cliente',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzStepsModule,
    DocumentoMaskDirective
  ],
  templateUrl: './identificacao-cliente.component.html',
  styleUrl: './identificacao-cliente.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IdentificacaoClienteComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly viaCepService = inject(ViaCepService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly clienteIdentificado = output<void>();
  readonly unidadeSlug = input<string | null>(null);

  protected readonly identificando = signal(false);
  protected readonly buscandoTelefone = signal(false);
  protected readonly buscandoCep = signal(false);
  protected readonly mensagemErro = signal<string | null>(null);
  protected readonly mensagemIdentificacao = signal<string | null>(null);
  protected readonly clienteEncontrado = signal<boolean | null>(null);
  protected readonly enderecoEncontrado = signal(false);
  protected readonly senhaVisivel = signal(false);
  protected readonly etapaCadastro = signal<0 | 1>(0);
  protected readonly etapaCadastroAtual = computed(() => this.etapaCadastro());

  protected readonly identificacaoForm = this.fb.group({
    telefone: ['', [Validators.required, Validators.pattern(/^\(?[1-9]{2}\)?\s?(9?[0-9]{4})-?[0-9]{4}$/)]],
    nome: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    login: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(6)]],
    endereco: this.fb.group({
      cep: ['', [Validators.pattern(/^\d{5}-?\d{3}$/)]],
      logradouro: ['', [Validators.maxLength(150)]],
      numero: ['', [Validators.maxLength(20)]],
      complemento: ['', [Validators.maxLength(100)]],
      bairro: ['', [Validators.maxLength(100)]],
      cidade: ['', [Validators.maxLength(100)]],
      estado: ['', [Validators.pattern(/^[A-Za-z]{2}$/)]],
      principal: [true]
    })
  });

  constructor() {
    this.observarTelefone();
    this.observarCep();
    this.aplicarValidadoresIdentificacao();
  }

  protected identificarCliente(): void {
    this.mensagemErro.set(null);
    this.mensagemIdentificacao.set(null);
    this.aplicarValidadoresIdentificacao();

    if (this.identificacaoForm.invalid) {
      this.identificacaoForm.markAllAsTouched();
      return;
    }

    const valor = this.identificacaoForm.getRawValue();
    this.identificando.set(true);

    const slug = this.unidadeSlug();

    if (!slug && !this.clienteEncontrado()) {
      this.identificando.set(false);
      this.mensagemErro.set('Acesse o checkout pelo link do cardápio da unidade.');
      return;
    }

    const operacao$ = this.clienteEncontrado()
      ? this.authService.entrar({
          email: valor.login.trim(),
          senha: valor.senha
        })
      : this.authService.cadastrarClienteCheckoutUnidade(slug ?? '', this.montarRequestCadastro(valor));

    operacao$.pipe(
      finalize(() => this.identificando.set(false))
    ).subscribe({
      next: () => {
        this.mensagemIdentificacao.set('Cliente identificado. Continue a finalização.');
        this.message.success('Cliente identificado.');
        this.clienteIdentificado.emit();
      },
      error: (error: HttpErrorResponse) => {
        this.mensagemErro.set(this.extrairMensagemErro(error, 'Não foi possível identificar o cliente.'));
      }
    });
  }

  protected avancarEtapaCadastro(): void {
    this.mensagemErro.set(null);

    if (!this.validarControles([
      this.identificacaoForm.controls.telefone,
      this.identificacaoForm.controls.nome,
      this.identificacaoForm.controls.login
    ])) {
      this.mensagemErro.set('Revise os dados de acesso antes de continuar.');
      return;
    }

    this.etapaCadastro.set(1);
  }

  protected voltarEtapaCadastro(): void {
    this.mensagemErro.set(null);
    this.etapaCadastro.set(0);
  }

  protected alternarVisibilidadeSenha(): void {
    this.senhaVisivel.update((visivel) => !visivel);
  }

  private montarRequestCadastro(valor: ReturnType<IdentificacaoClienteComponent['identificacaoForm']['getRawValue']>): ClienteCheckoutRequest {
    return {
      nome: valor.nome.trim(),
      login: valor.login.trim(),
      telefone: valor.telefone.trim(),
      senha: valor.senha,
      endereco: {
        cep: valor.endereco.cep.trim(),
        logradouro: valor.endereco.logradouro.trim(),
        numero: valor.endereco.numero.trim(),
        complemento: valor.endereco.complemento.trim() || null,
        bairro: valor.endereco.bairro.trim(),
        cidade: valor.endereco.cidade.trim(),
        estado: valor.endereco.estado.trim(),
        principal: valor.endereco.principal
      }
    };
  }

  private observarTelefone(): void {
    this.identificacaoForm.controls.telefone.valueChanges.pipe(
      debounceTime(450),
      map((telefone) => telefone.replace(/\D/g, '')),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((telefone) => {
      if (telefone.length < 10) {
        this.clienteEncontrado.set(null);
        this.etapaCadastro.set(0);
        this.mensagemIdentificacao.set(null);
        this.limparDadosIdentificacao();
        this.aplicarValidadoresIdentificacao();
        return;
      }

      if (telefone.length > 11) {
        return;
      }

      this.clienteEncontrado.set(null);
      this.etapaCadastro.set(0);
      this.limparDadosIdentificacao();
      this.aplicarValidadoresIdentificacao();
      this.buscarClientePorTelefone(telefone);
    });
  }

  private buscarClientePorTelefone(telefone: string): void {
    this.buscandoTelefone.set(true);
    this.mensagemIdentificacao.set('Buscando cadastro...');

    const slug = this.unidadeSlug();

    if (!slug) {
      this.buscandoTelefone.set(false);
      this.mensagemIdentificacao.set('Acesse o checkout pelo link do cardápio da unidade.');
      return;
    }

    const operacao$ = this.authService.buscarClientePorTelefoneUnidade(slug, telefone);

    operacao$.pipe(
      finalize(() => this.buscandoTelefone.set(false))
    ).subscribe({
      next: (cliente) => {
        this.clienteEncontrado.set(cliente.encontrado);

        if (cliente.encontrado) {
          this.identificacaoForm.patchValue({
            nome: cliente.nome ?? '',
            login: cliente.email ?? '',
            telefone: cliente.telefone ?? this.identificacaoForm.controls.telefone.value,
            senha: ''
          }, { emitEvent: false });

          if (cliente.endereco) {
            this.identificacaoForm.controls.endereco.patchValue({
              cep: cliente.endereco.cep,
              logradouro: cliente.endereco.logradouro,
              numero: cliente.endereco.numero,
              complemento: cliente.endereco.complemento ?? '',
              bairro: cliente.endereco.bairro,
              cidade: cliente.endereco.cidade,
              estado: cliente.endereco.estado,
              principal: cliente.endereco.principal
            }, { emitEvent: false });
            this.enderecoEncontrado.set(true);
          } else {
            this.limparEndereco();
          }

          this.aplicarValidadoresIdentificacao();
          this.mensagemIdentificacao.set('Cadastro encontrado. Informe sua senha para continuar.');
          return;
        }

        this.limparDadosIdentificacao();
        this.etapaCadastro.set(0);
        this.aplicarValidadoresIdentificacao();
        this.mensagemIdentificacao.set('Não encontramos cadastro com esse telefone. Complete seus dados para continuar.');
      },
      error: () => {
        this.clienteEncontrado.set(null);
        this.mensagemIdentificacao.set('Não foi possível buscar o cadastro agora. Confira o telefone e tente novamente.');
      }
    });
  }

  private observarCep(): void {
    this.identificacaoForm.controls.endereco.controls.cep.valueChanges.pipe(
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
          this.message.warning('CEP não encontrado.');
          return;
        }

        this.identificacaoForm.controls.endereco.patchValue({
          cep: dados.cep,
          logradouro: dados.logradouro,
          bairro: dados.bairro,
          cidade: dados.localidade,
          estado: dados.uf
        });
      },
      error: () => this.message.error('Não foi possível buscar o CEP.')
    });
  }

  private limparEnderecoViaCep(): void {
    this.identificacaoForm.controls.endereco.patchValue({
      logradouro: '',
      bairro: '',
      cidade: '',
      estado: ''
    }, { emitEvent: false });
  }

  private limparDadosIdentificacao(): void {
    this.identificacaoForm.patchValue({
      nome: '',
      login: '',
      senha: ''
    }, { emitEvent: false });
    this.limparEndereco();
  }

  private limparEndereco(): void {
    this.identificacaoForm.controls.endereco.patchValue({
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      principal: true
    }, { emitEvent: false });
    this.enderecoEncontrado.set(false);
  }

  private aplicarValidadoresIdentificacao(): void {
    const clienteEncontrado = this.clienteEncontrado();
    const controls = this.identificacaoForm.controls;

    controls.nome.clearValidators();
    controls.login.clearValidators();
    controls.senha.clearValidators();

    if (clienteEncontrado === true) {
      controls.login.setValidators([Validators.required, Validators.email]);
      controls.senha.setValidators([Validators.required, Validators.minLength(6)]);
    }

    if (clienteEncontrado === false) {
      controls.nome.setValidators([Validators.required, Validators.minLength(3), Validators.maxLength(120)]);
      controls.login.setValidators([Validators.required, Validators.email]);
      controls.senha.setValidators([Validators.required, Validators.minLength(6)]);
    }

    controls.nome.updateValueAndValidity({ emitEvent: false });
    controls.login.updateValueAndValidity({ emitEvent: false });
    controls.senha.updateValueAndValidity({ emitEvent: false });
    this.aplicarValidadoresEndereco(clienteEncontrado === false);
  }

  private aplicarValidadoresEndereco(obrigatorio: boolean): void {
    const endereco = this.identificacaoForm.controls.endereco.controls;
    const camposObrigatorios = [endereco.cep, endereco.logradouro, endereco.numero, endereco.bairro, endereco.cidade, endereco.estado];

    camposObrigatorios.forEach((control) => {
      control.removeValidators(Validators.required);

      if (obrigatorio) {
        control.addValidators(Validators.required);
      }

      control.updateValueAndValidity({ emitEvent: false });
    });
  }

  private validarControles(controls: AbstractControl[]): boolean {
    controls.forEach((control) => {
      control.markAsTouched();
      control.updateValueAndValidity({ emitEvent: false });
    });

    return controls.every((control) => control.valid);
  }

  private extrairMensagemErro(error: HttpErrorResponse, mensagemPadrao: string): string {
    const body = error.error;

    if (this.ehErroValidacao(body)) {
      return body.errors.map((erroCampo) => erroCampo.message).join(' ');
    }

    if (this.ehErroPadrao(body)) {
      return body.message || body.error || mensagemPadrao;
    }

    return mensagemPadrao;
  }

  private ehErroValidacao(value: unknown): value is ValidationError {
    return !!value && typeof value === 'object' && Array.isArray((value as ValidationError).errors);
  }

  private ehErroPadrao(value: unknown): value is StandardError {
    return !!value && typeof value === 'object' && 'message' in value;
  }
}
