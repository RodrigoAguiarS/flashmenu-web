import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { PERMISSOES } from '../../core/auth/permissoes';
import { StandardError, ValidationError } from '../../core/models/api-error.model';
import { EmpresaRequest, EmpresaResponse } from '../../core/models/empresa.model';
import { AuthService } from '../../core/services/auth.service';
import { EmpresaService } from '../../core/services/empresa.service';
import { DocumentoMaskDirective } from '../../shared/directives/documento-mask.directive';
import { CnpjPipe } from '../../shared/pipes/cnpj.pipe';
import { TelefonePipe } from '../../shared/pipes/telefone.pipe';

@Component({
  selector: 'app-empresa',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    DocumentoMaskDirective,
    CnpjPipe,
    TelefonePipe,
    NzAlertModule,
    NzButtonModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzSpinModule,
    NzTagModule
  ],
  templateUrl: './empresa.component.html',
  styleUrl: './empresa.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmpresaComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly empresaService = inject(EmpresaService);
  private readonly message = inject(NzMessageService);

  protected readonly empresa = signal<EmpresaResponse | null>(null);
  protected readonly carregando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly mensagemErro = signal<string | null>(null);
  protected readonly errosValidacao = signal<string[]>([]);

  protected readonly empresaExiste = computed(() => this.empresa() !== null);
  protected readonly podeCriar = computed(() => this.authService.possuiPermissao(PERMISSOES.EMPRESA_CRIAR));
  protected readonly podeEditar = computed(() => this.authService.possuiPermissao(PERMISSOES.EMPRESA_EDITAR));
  protected readonly podeSalvar = computed(() => this.empresaExiste() ? this.podeEditar() : this.podeCriar());
  protected readonly modoTela = computed(() => this.empresaExiste() ? 'Atualizacao' : 'Cadastro');
  protected readonly textoBotao = computed(() => this.empresaExiste() ? 'Salvar alteracoes' : 'Cadastrar empresa');

  protected readonly form = this.fb.group({
    nomeFantasia: ['', [Validators.required, Validators.maxLength(120)]],
    razaoSocial: ['', [Validators.required, Validators.maxLength(150)]],
    cnpj: ['', [Validators.required, Validators.pattern(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/)]],
    email: ['', [Validators.email, Validators.maxLength(150)]],
    telefone: ['', [Validators.pattern(/^$|^\(?[1-9]{2}\)?\s?(9?[0-9]{4})-?[0-9]{4}$/)]]
  });

  ngOnInit(): void {
    this.carregarEmpresa();
  }

  protected salvar(): void {
    this.mensagemErro.set(null);
    this.errosValidacao.set([]);

    if (!this.podeSalvar()) {
      this.message.warning('Seu usuario nao possui permissao para salvar empresa.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const request = this.montarRequest();
    const operacao = this.empresaExiste()
      ? this.empresaService.atualizar(request)
      : this.empresaService.criar(request);

    this.salvando.set(true);

    operacao.pipe(
      finalize(() => this.salvando.set(false))
    ).subscribe({
      next: (empresa) => {
        this.empresa.set(empresa);
        this.preencherFormulario(empresa);
        this.message.success('Empresa salva com sucesso.');
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  protected recarregar(): void {
    this.carregarEmpresa();
  }

  private carregarEmpresa(): void {
    this.carregando.set(true);
    this.mensagemErro.set(null);
    this.errosValidacao.set([]);

    this.empresaService.buscar().pipe(
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: (empresa) => {
        this.empresa.set(empresa);
        this.preencherFormulario(empresa);
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.empresa.set(null);
          this.form.reset({
            nomeFantasia: '',
            razaoSocial: '',
            cnpj: '',
            email: '',
            telefone: ''
          });
          return;
        }

        this.tratarErro(error);
      }
    });
  }

  private preencherFormulario(empresa: EmpresaResponse): void {
    this.form.reset({
      nomeFantasia: empresa.nomeFantasia,
      razaoSocial: empresa.razaoSocial,
      cnpj: empresa.cnpj,
      email: empresa.email ?? '',
      telefone: empresa.telefone ?? ''
    });
  }

  private montarRequest(): EmpresaRequest {
    const valor = this.form.getRawValue();

    return {
      nomeFantasia: valor.nomeFantasia.trim(),
      razaoSocial: valor.razaoSocial.trim(),
      cnpj: valor.cnpj.trim(),
      email: valor.email.trim() || null,
      telefone: valor.telefone.trim() || null
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
      this.mensagemErro.set(body.message || body.error || 'Nao foi possivel salvar a empresa.');
      return;
    }

    this.mensagemErro.set('Nao foi possivel salvar a empresa.');
  }

  private formatarErroCampo(fieldName: string, message: string): string {
    const labels: Record<string, string> = {
      nomeFantasia: 'Nome fantasia',
      razaoSocial: 'Razao social',
      cnpj: 'CNPJ',
      email: 'E-mail',
      telefone: 'Telefone'
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
