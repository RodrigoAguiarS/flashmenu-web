import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, debounceTime, distinctUntilChanged, finalize, forkJoin, of, switchMap } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { PERMISSOES } from '../../../core/auth/permissoes';
import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { EnderecoRequest, EnderecoResponse } from '../../../core/models/endereco.model';
import { UsuarioResponse } from '../../../core/models/usuario.model';
import { AuthService } from '../../../core/services/auth.service';
import { EnderecoService } from '../../../core/services/endereco.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import { ViaCepService } from '../../../core/services/via-cep.service';

@Component({
  selector: 'app-usuario-endereco',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    NzAlertModule,
    NzButtonModule,
    NzEmptyModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzPopconfirmModule,
    NzSpinModule,
    NzSwitchModule,
    NzTagModule,
    NzTooltipModule
  ],
  templateUrl: './usuario-endereco.component.html',
  styleUrl: './usuario-endereco.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsuarioEnderecoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly enderecoService = inject(EnderecoService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly viaCepService = inject(ViaCepService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly usuarioId = signal<number | null>(null);
  protected readonly usuario = signal<UsuarioResponse | null>(null);
  protected readonly enderecos = signal<EnderecoResponse[]>([]);
  protected readonly enderecoEditando = signal<EnderecoResponse | null>(null);
  protected readonly carregando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly processandoId = signal<number | null>(null);
  protected readonly mensagemErro = signal<string | null>(null);
  protected readonly buscandoCep = signal(false);
  protected readonly podeEditar = computed(() => this.authService.possuiPermissao(PERMISSOES.USUARIO_EDITAR));
  protected readonly possuiEnderecos = computed(() => this.enderecos().length > 0);
  protected readonly tituloFormulario = computed(() => this.enderecoEditando() ? 'Editar endereco' : 'Novo endereco');
  protected readonly textoBotao = computed(() => this.enderecoEditando() ? 'Salvar alteracoes' : 'Cadastrar endereco');

  protected readonly form = this.fb.group({
    cep: ['', [Validators.required, Validators.pattern(/^\d{5}-?\d{3}$/)]],
    logradouro: ['', [Validators.required, Validators.maxLength(150)]],
    numero: ['', [Validators.required, Validators.maxLength(20)]],
    complemento: ['', [Validators.maxLength(100)]],
    bairro: ['', [Validators.required, Validators.maxLength(100)]],
    cidade: ['', [Validators.required, Validators.maxLength(100)]],
    estado: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]],
    principal: [false]
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('usuarioId'));
    if (!Number.isFinite(id) || id <= 0) {
      this.mensagemErro.set('Usuario invalido.');
      return;
    }

    this.usuarioId.set(id);
    this.observarCep();
    this.carregarDados(id);
  }

  protected salvar(): void {
    const usuarioId = this.usuarioId();
    if (!usuarioId || !this.podeEditar()) {
      this.message.warning('Seu usuario nao possui permissao para alterar enderecos.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const endereco = this.enderecoEditando();
    const request = this.montarRequest();
    const operacao = endereco
      ? this.enderecoService.atualizar(usuarioId, endereco.id, request)
      : this.enderecoService.criar(usuarioId, request);

    this.salvando.set(true);
    this.mensagemErro.set(null);

    operacao.pipe(
      finalize(() => this.salvando.set(false))
    ).subscribe({
      next: () => {
        this.message.success('Endereco salvo com sucesso.');
        this.limparFormulario();
        this.carregarEnderecos(usuarioId);
      },
      error: (error: HttpErrorResponse) => this.mensagemErro.set(this.extrairMensagemErro(error))
    });
  }

  protected editar(endereco: EnderecoResponse): void {
    this.enderecoEditando.set(endereco);
    this.form.reset({
      cep: this.formatarCep(endereco.cep),
      logradouro: endereco.logradouro,
      numero: endereco.numero,
      complemento: endereco.complemento ?? '',
      bairro: endereco.bairro,
      cidade: endereco.cidade,
      estado: endereco.estado,
      principal: endereco.principal
    });
  }

  protected limparFormulario(): void {
    this.enderecoEditando.set(null);
    this.form.reset({
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

  protected definirPrincipal(endereco: EnderecoResponse): void {
    const usuarioId = this.usuarioId();
    if (!usuarioId || endereco.principal) {
      return;
    }

    this.executarAcao(endereco.id, 'Endereco principal atualizado.', () =>
      this.enderecoService.definirPrincipal(usuarioId, endereco.id)
    );
  }

  protected excluir(endereco: EnderecoResponse): void {
    const usuarioId = this.usuarioId();
    if (!usuarioId) {
      return;
    }

    this.executarAcao(endereco.id, 'Endereco excluido com sucesso.', () =>
      this.enderecoService.excluir(usuarioId, endereco.id).pipe(switchMap(() => of(null)))
    );
  }

  protected formatarEndereco(endereco: EnderecoResponse): string {
    const complemento = endereco.complemento ? `, ${endereco.complemento}` : '';
    return `${endereco.logradouro}, ${endereco.numero}${complemento}`;
  }

  protected formatarCep(cep: string): string {
    const numeros = cep.replace(/\D/g, '');
    return numeros.length === 8 ? `${numeros.slice(0, 5)}-${numeros.slice(5)}` : cep;
  }

  private carregarDados(usuarioId: number): void {
    this.carregando.set(true);
    this.mensagemErro.set(null);

    forkJoin({
      usuario: this.usuarioService.buscarPorId(usuarioId),
      enderecos: this.enderecoService.listar(usuarioId)
    }).pipe(
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: ({ usuario, enderecos }) => {
        this.usuario.set(usuario);
        this.enderecos.set(enderecos);
      },
      error: (error: HttpErrorResponse) => this.mensagemErro.set(this.extrairMensagemErro(error))
    });
  }

  private carregarEnderecos(usuarioId: number): void {
    this.enderecoService.listar(usuarioId).subscribe({
      next: (enderecos) => this.enderecos.set(enderecos),
      error: (error: HttpErrorResponse) => this.mensagemErro.set(this.extrairMensagemErro(error))
    });
  }

  private executarAcao(
    enderecoId: number,
    mensagemSucesso: string,
    acao: () => Observable<unknown>
  ): void {
    const usuarioId = this.usuarioId();
    if (!usuarioId || !this.podeEditar()) {
      this.message.warning('Seu usuario nao possui permissao para alterar enderecos.');
      return;
    }

    this.processandoId.set(enderecoId);
    this.mensagemErro.set(null);

    acao().pipe(
      finalize(() => this.processandoId.set(null))
    ).subscribe({
      next: () => {
        this.message.success(mensagemSucesso);
        this.carregarEnderecos(usuarioId);
      },
      error: (error: HttpErrorResponse) => this.mensagemErro.set(this.extrairMensagemErro(error))
    });
  }

  private montarRequest(): EnderecoRequest {
    const valores = this.form.getRawValue();

    return {
      cep: valores.cep,
      logradouro: valores.logradouro,
      numero: valores.numero,
      complemento: valores.complemento.trim() || null,
      bairro: valores.bairro,
      cidade: valores.cidade,
      estado: valores.estado,
      principal: valores.principal
    };
  }

  private observarCep(): void {
    this.form.controls.cep.valueChanges.pipe(
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

        this.form.patchValue({
          cep: dados.cep,
          logradouro: dados.logradouro,
          bairro: dados.bairro,
          cidade: dados.localidade,
          estado: dados.uf
        });
        this.form.controls.numero.markAsTouched();
      },
      error: () => this.message.error('Nao foi possivel buscar o CEP.')
    });
  }

  private limparEnderecoViaCep(): void {
    this.form.patchValue({
      logradouro: '',
      bairro: '',
      cidade: '',
      estado: ''
    }, { emitEvent: false });
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
