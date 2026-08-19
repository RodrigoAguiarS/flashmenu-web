import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, finalize, forkJoin, of, switchMap } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

import { PERMISSOES } from '../../../core/auth/permissoes';
import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { EnderecoRequest } from '../../../core/models/endereco.model';
import { PerfilResponse } from '../../../core/models/perfil.model';
import { UnidadeResponse } from '../../../core/models/unidade.model';
import { UsuarioRequest } from '../../../core/models/usuario.model';
import { AuthService } from '../../../core/services/auth.service';
import { PerfilService } from '../../../core/services/perfil.service';
import { UnidadeService } from '../../../core/services/unidade.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import { ViaCepService } from '../../../core/services/via-cep.service';
import { DocumentoMaskDirective } from '../../../shared/directives/documento-mask.directive';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

const SENHA_NAO_ALTERADA = 'senha-nao-alterada';

@Component({
  selector: 'app-usuario-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DocumentoMaskDirective,
    NzAlertModule,
    NzButtonModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzSelectModule,
    NzSpinModule,
    NzSwitchModule,
    PageHeaderComponent
  ],
  templateUrl: './usuario-form.component.html',
  styleUrl: './usuario-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsuarioFormComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly perfilService = inject(PerfilService);
  private readonly unidadeService = inject(UnidadeService);
  private readonly viaCepService = inject(ViaCepService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly idUsuario = signal<number | null>(null);
  protected readonly carregando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly perfis = signal<PerfilResponse[]>([]);
  protected readonly unidades = signal<UnidadeResponse[]>([]);
  protected readonly mensagemErro = signal<string | null>(null);
  protected readonly errosValidacao = signal<string[]>([]);
  protected readonly senhaVisivel = signal(false);
  protected readonly novaSenhaVisivel = signal(false);
  protected readonly buscandoCep = signal(false);
  protected readonly editando = computed(() => this.idUsuario() !== null);
  protected readonly titulo = computed(() => this.editando() ? 'Editar usuario' : 'Novo usuario');
  protected readonly textoBotao = computed(() => this.editando() ? 'Salvar alteracoes' : 'Cadastrar usuario');
  protected readonly podeGerenciarUnidadeUsuario = computed(() => this.authService.permissoes().has(PERMISSOES.ADMIN));
  protected readonly unidadesOpcoes = computed(() => this.unidades().map((unidade) => ({
    id: unidade.id,
    label: unidade.slug ? `${unidade.nome} (${unidade.slug})` : unidade.nome
  })));

  protected readonly formulario = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    login: ['', [Validators.required, Validators.email]],
    telefone: ['', [Validators.required, Validators.pattern(/^\(?[1-9]{2}\)?\s?(9?[0-9]{4})-?[0-9]{4}$/)]],
    idPerfil: this.fb.control<number | null>(null, [Validators.required]),
    idUnidade: this.fb.control<number | null>(null),
    senha: [''],
    novaSenha: [''],
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

  ngOnInit(): void {
    this.configurarPermissaoUnidade();

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
      this.formulario.controls.senha.updateValueAndValidity({ emitEvent: false });
      this.formulario.controls.novaSenha.updateValueAndValidity({ emitEvent: false });
      this.carregarDadosEdicao(idNumerico);
      return;
    }

    this.formulario.controls.senha.setValidators([Validators.required, Validators.minLength(6)]);
    this.formulario.controls.novaSenha.clearValidators();
    this.formulario.controls.senha.updateValueAndValidity({ emitEvent: false });
    this.formulario.controls.novaSenha.updateValueAndValidity({ emitEvent: false });
    this.aplicarValidadoresEnderecoCadastro();
    this.observarCep();
    this.carregarOpcoesFormulario();
  }

  enviar(): void {
    this.mensagemErro.set(null);
    this.errosValidacao.set([]);
    this.formulario.controls.senha.updateValueAndValidity();
    this.formulario.controls.novaSenha.updateValueAndValidity();
    this.atualizarValidadeEndereco();

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.mensagemErro.set('Revise os campos obrigatorios antes de salvar.');
      this.errosValidacao.set(this.coletarErrosFormulario(this.formulario));
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

  private carregarOpcoesFormulario(): void {
    this.carregando.set(true);

    const unidades$ = this.podeGerenciarUnidadeUsuario()
      ? this.unidadeService.listar()
      : of([] as UnidadeResponse[]);

    forkJoin({
      perfis: this.perfilService.listar({ page: 0, size: 100, sort: 'descricao' }),
      unidades: unidades$
    }).pipe(
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: (resultado) => {
        this.perfis.set(resultado.perfis.content);
        this.unidades.set(resultado.unidades);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  private carregarDadosEdicao(id: number): void {
    this.carregando.set(true);

    forkJoin({
      usuario: this.usuarioService.buscarPorId(id),
      perfis: this.perfilService.listar({ page: 0, size: 100, sort: 'descricao' }),
      unidades: this.podeGerenciarUnidadeUsuario() ? this.unidadeService.listar() : of([] as UnidadeResponse[])
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
      this.unidades.set(resultado.unidades);
      this.formulario.patchValue({
        nome: resultado.usuario.nome,
        login: resultado.usuario.email,
        telefone: resultado.usuario.telefone || '',
        idPerfil: resultado.usuario.perfil?.id ?? null,
        idUnidade: this.podeGerenciarUnidadeUsuario() ? resultado.usuario.unidade?.id ?? null : null,
        senha: '',
        novaSenha: '',
        endereco: {
          cep: '',
          logradouro: '',
          numero: '',
          complemento: '',
          bairro: '',
          cidade: '',
          estado: '',
          principal: true
        }
      });
    });
  }

  private montarRequest(): UsuarioRequest {
    const valor = this.formulario.getRawValue();
    const request: UsuarioRequest = {
      nome: valor.nome.trim(),
      login: valor.login.trim(),
      telefone: valor.telefone.trim(),
      idPerfil: valor.idPerfil ?? 0,
      senha: this.editando() ? SENHA_NAO_ALTERADA : valor.senha
    };

    if (this.podeGerenciarUnidadeUsuario()) {
      request.idUnidade = valor.idUnidade ?? 0;
    }

    if (!this.editando()) {
      request.endereco = this.montarEnderecoRequest();
    }

    return request;
  }

  private montarEnderecoRequest(): EnderecoRequest {
    const endereco = this.formulario.controls.endereco.getRawValue();

    return {
      cep: endereco.cep.trim(),
      logradouro: endereco.logradouro.trim(),
      numero: endereco.numero.trim(),
      complemento: endereco.complemento.trim() || null,
      bairro: endereco.bairro.trim(),
      cidade: endereco.cidade.trim(),
      estado: endereco.estado.trim(),
      principal: endereco.principal
    };
  }

  private aplicarValidadoresEnderecoCadastro(): void {
    const endereco = this.formulario.controls.endereco.controls;
    endereco.cep.addValidators([Validators.required]);
    endereco.logradouro.addValidators([Validators.required]);
    endereco.numero.addValidators([Validators.required]);
    endereco.bairro.addValidators([Validators.required]);
    endereco.cidade.addValidators([Validators.required]);
    endereco.estado.addValidators([Validators.required]);
    this.atualizarValidadeEndereco();
  }

  private configurarPermissaoUnidade(): void {
    const control = this.formulario.controls.idUnidade;

    if (this.podeGerenciarUnidadeUsuario()) {
      control.enable({ emitEvent: false });
      control.setValidators([Validators.required]);
    } else {
      control.reset(null, { emitEvent: false });
      control.clearValidators();
      control.disable({ emitEvent: false });
    }

    control.updateValueAndValidity({ emitEvent: false });
  }

  private observarCep(): void {
    this.formulario.controls.endereco.controls.cep.valueChanges.pipe(
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
    const endereco = this.formulario.controls.endereco.controls;
    this.buscandoCep.set(true);

    this.viaCepService.buscarPorCep(cep).pipe(
      finalize(() => this.buscandoCep.set(false))
    ).subscribe({
      next: (dados) => {
        if (dados.erro) {
          this.message.warning('CEP nao encontrado.');
          return;
        }

        this.formulario.controls.endereco.patchValue({
          cep: dados.cep,
          logradouro: dados.logradouro,
          bairro: dados.bairro,
          cidade: dados.localidade,
          estado: dados.uf
        });
        endereco.numero.markAsTouched();
      },
      error: () => this.message.error('Nao foi possivel buscar o CEP.')
    });
  }

  private limparEnderecoViaCep(): void {
    this.formulario.controls.endereco.patchValue({
      logradouro: '',
      bairro: '',
      cidade: '',
      estado: ''
    }, { emitEvent: false });
  }

  private atualizarValidadeEndereco(): void {
    Object.values(this.formulario.controls.endereco.controls).forEach((control) =>
      control.updateValueAndValidity({ emitEvent: false })
    );
  }

  private coletarErrosFormulario(formGroup: FormGroup, prefixo = ''): string[] {
    return Object.entries(formGroup.controls).flatMap(([nomeControle, controle]) => {
      const caminho = prefixo ? `${prefixo}.${nomeControle}` : nomeControle;

      if (controle instanceof FormGroup) {
        return this.coletarErrosFormulario(controle, caminho);
      }

      return controle.invalid ? [this.formatarErroControle(caminho, controle)] : [];
    });
  }

  private formatarErroControle(fieldName: string, control: AbstractControl): string {
    if (control.hasError('required')) {
      return `${this.labelCampo(fieldName)}: Campo obrigatorio`;
    }

    if (control.hasError('email')) {
      return `${this.labelCampo(fieldName)}: Informe um e-mail valido`;
    }

    if (control.hasError('minlength')) {
      const tamanhoMinimo = control.getError('minlength')?.requiredLength;
      return `${this.labelCampo(fieldName)}: Informe pelo menos ${tamanhoMinimo} caracteres`;
    }

    if (control.hasError('maxlength')) {
      const tamanhoMaximo = control.getError('maxlength')?.requiredLength;
      return `${this.labelCampo(fieldName)}: Informe no maximo ${tamanhoMaximo} caracteres`;
    }

    if (control.hasError('pattern')) {
      return `${this.labelCampo(fieldName)}: Formato invalido`;
    }

    return `${this.labelCampo(fieldName)}: Valor invalido`;
  }

  private tratarErro(error: HttpErrorResponse): void {
    const body = error.error;

    if (this.ehErroValidacao(body)) {
      this.mensagemErro.set(body.error || 'Erro de validacao.');
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
    return `${this.labelCampo(fieldName)}: ${message}`;
  }

  private labelCampo(fieldName: string): string {
    const labels: Record<string, string> = {
      nome: 'Nome',
      login: 'E-mail',
      email: 'E-mail',
      telefone: 'Telefone',
      senha: 'Senha',
      novaSenha: 'Nova senha',
      idPerfil: 'Perfil',
      idUnidade: 'Unidade',
      'endereco.cep': 'CEP',
      'endereco.logradouro': 'Logradouro',
      'endereco.numero': 'Numero',
      'endereco.complemento': 'Complemento',
      'endereco.bairro': 'Bairro',
      'endereco.cidade': 'Cidade',
      'endereco.estado': 'UF',
      endereco: 'Endereco'
    };

    return labels[fieldName] ?? fieldName;
  }

  private ehErroValidacao(value: unknown): value is ValidationError {
    return !!value && typeof value === 'object' && Array.isArray((value as ValidationError).errors);
  }

  private ehErroPadrao(value: unknown): value is StandardError {
    return !!value && typeof value === 'object' && 'message' in value;
  }
}
