import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, of } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTimePickerModule } from 'ng-zorro-antd/time-picker';

import { PERMISSOES } from '../../../core/auth/permissoes';
import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import {
  DiaSemana,
  DIAS_SEMANA,
  HorarioFuncionamentoRequest,
  HorarioFuncionamentoResponse
} from '../../../core/models/horario-funcionamento.model';
import { UnidadeRequest } from '../../../core/models/unidade.model';
import { AuthService } from '../../../core/services/auth.service';
import { UnidadeService } from '../../../core/services/unidade.service';
import { ViaCepService } from '../../../core/services/via-cep.service';
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
    NzTimePickerModule,
    PageHeaderComponent
  ],
  templateUrl: './unidade-form.component.html',
  styleUrl: './unidade-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UnidadeFormComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly unidadeService = inject(UnidadeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly message = inject(NzMessageService);
  private readonly viaCepService = inject(ViaCepService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly idUnidade = signal<number | null>(null);
  protected readonly carregando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly buscandoCep = signal(false);
  protected readonly carregandoHorarios = signal(false);
  protected readonly salvandoHorarios = signal(false);
  protected readonly mensagemErroHorarios = signal<string | null>(null);
  protected readonly mensagemErro = signal<string | null>(null);
  protected readonly errosValidacao = signal<string[]>([]);
  protected readonly editando = computed(() => this.idUnidade() !== null);
  protected readonly titulo = computed(() => this.editando() ? 'Editar unidade' : 'Nova unidade');
  protected readonly textoBotao = computed(() => this.editando() ? 'Salvar alteracoes' : 'Cadastrar unidade');
  protected readonly diasSemana = DIAS_SEMANA;
  protected readonly podeVisualizarHorarios = computed(() =>
    this.authService.possuiPermissao(PERMISSOES.HORARIO_FUNCIONAMENTO_LISTAR)
  );
  protected readonly podeEditarHorarios = computed(() =>
    this.authService.possuiAlgumaPermissao([
      PERMISSOES.HORARIO_FUNCIONAMENTO_EDITAR,
      PERMISSOES.HORARIO_FUNCIONAMENTO_CRIAR
    ])
  );
  protected readonly linkPreview = computed(() => {
    const slug = this.formulario.controls.slug.value.trim();
    return slug ? `${window.location.origin}/loja/${slug}` : `${window.location.origin}/loja/slug-da-unidade`;
  });

  protected readonly formulario = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), Validators.maxLength(80)]],
    ativo: [true],
    endereco: this.fb.group({
      cep: ['', [Validators.required, Validators.pattern(/^\d{5}-?\d{3}$/)]],
      logradouro: ['', [Validators.required, Validators.maxLength(150)]],
      numero: ['', [Validators.required, Validators.maxLength(20)]],
      complemento: ['', [Validators.maxLength(100)]],
      bairro: ['', [Validators.required, Validators.maxLength(100)]],
      cidade: ['', [Validators.required, Validators.maxLength(100)]],
      estado: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]]
    })
  });
  protected readonly horariosForm = this.fb.array(
    DIAS_SEMANA.map((dia) => this.criarHorarioForm(dia.value))
  );

  ngOnInit(): void {
    this.observarCep();

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

    if (this.podeVisualizarHorarios()) {
      this.carregarHorarios(idNumerico);
    }
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

  protected salvarHorarios(): void {
    const id = this.idUnidade();
    this.mensagemErroHorarios.set(null);

    if (!id || !this.podeEditarHorarios()) {
      return;
    }

    if (this.horariosForm.invalid) {
      this.horariosForm.markAllAsTouched();
      this.message.warning('Revise os horarios de funcionamento.');
      return;
    }

    this.salvandoHorarios.set(true);

    this.unidadeService.atualizarHorariosSemana(id, this.montarRequestHorarios()).pipe(
      finalize(() => this.salvandoHorarios.set(false))
    ).subscribe({
      next: (horarios) => {
        this.preencherHorarios(horarios);
        this.message.success('Horarios de funcionamento salvos com sucesso.');
      },
      error: (error: HttpErrorResponse) => this.mensagemErroHorarios.set(this.extrairMensagemErro(error))
    });
  }

  protected horarioAtivo(index: number): boolean {
    return this.horariosForm.at(index).controls.ativo.value;
  }

  protected horarioReadonly(index: number): boolean {
    return !this.podeEditarHorarios() || !this.horarioAtivo(index) || this.salvandoHorarios();
  }

  protected horarioInvalido(index: number): boolean {
    const grupo = this.horariosForm.at(index);
    return grupo.hasError('horarioInvalido') && (grupo.touched || grupo.dirty);
  }

  protected horariosObrigatorios(index: number): boolean {
    const grupo = this.horariosForm.at(index);
    return grupo.hasError('horariosObrigatorios') && (grupo.touched || grupo.dirty);
  }

  protected podeAplicarHorarioDiasUteis(): boolean {
    const segunda = this.horariosForm.at(0);
    return this.podeEditarHorarios() && segunda.controls.ativo.value && segunda.valid;
  }

  protected aplicarHorarioDiasUteis(): void {
    if (!this.podeAplicarHorarioDiasUteis()) {
      this.message.warning('Configure a segunda-feira com abertura e fechamento validos.');
      return;
    }

    const segunda = this.horariosForm.at(0).getRawValue();

    this.horariosForm.controls.slice(0, 5).forEach((grupo) => {
      grupo.patchValue({
        ativo: true,
        horaAbertura: segunda.horaAbertura ? new Date(segunda.horaAbertura) : null,
        horaFechamento: segunda.horaFechamento ? new Date(segunda.horaFechamento) : null
      });
      grupo.markAsDirty();
      grupo.updateValueAndValidity();
    });

    this.message.success('Horario aplicado de segunda a sexta.');
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
        ativo: unidade.ativo,
        endereco: {
          cep: unidade.endereco?.cep ?? '',
          logradouro: unidade.endereco?.logradouro ?? '',
          numero: unidade.endereco?.numero ?? '',
          complemento: unidade.endereco?.complemento ?? '',
          bairro: unidade.endereco?.bairro ?? '',
          cidade: unidade.endereco?.cidade ?? '',
          estado: unidade.endereco?.estado ?? ''
        }
      });
    });
  }

  private carregarHorarios(unidadeId: number): void {
    this.carregandoHorarios.set(true);
    this.mensagemErroHorarios.set(null);

    this.unidadeService.listarHorarios(unidadeId).pipe(
      finalize(() => this.carregandoHorarios.set(false))
    ).subscribe({
      next: (horarios) => this.preencherHorarios(horarios),
      error: (error: HttpErrorResponse) => this.mensagemErroHorarios.set(this.extrairMensagemErro(error))
    });
  }

  private montarRequest(): UnidadeRequest {
    const valor = this.formulario.getRawValue();

    return {
      nome: valor.nome.trim(),
      slug: valor.slug.trim(),
      ativo: valor.ativo,
      endereco: {
        cep: valor.endereco.cep.trim(),
        logradouro: valor.endereco.logradouro.trim(),
        numero: valor.endereco.numero.trim(),
        complemento: valor.endereco.complemento.trim() || null,
        bairro: valor.endereco.bairro.trim(),
        cidade: valor.endereco.cidade.trim(),
        estado: valor.endereco.estado.trim().toUpperCase()
      }
    };
  }

  private criarHorarioForm(diaSemana: DiaSemana) {
    return this.fb.group({
      id: this.fb.control<number | null>(null),
      diaSemana: this.fb.control<DiaSemana>(diaSemana),
      ativo: [false],
      horaAbertura: this.fb.control<Date | null>(null),
      horaFechamento: this.fb.control<Date | null>(null)
    }, { validators: this.validarHorarioFuncionamento });
  }

  private preencherHorarios(horarios: HorarioFuncionamentoResponse[]): void {
    const horariosPorDia = new Map(horarios.map((horario) => [horario.diaSemana, horario]));

    this.horariosForm.controls.forEach((grupo) => {
      const diaSemana = grupo.controls.diaSemana.value;
      const horario = horariosPorDia.get(diaSemana);

      grupo.reset({
        id: horario?.id ?? null,
        diaSemana,
        ativo: horario?.ativo ?? false,
        horaAbertura: this.paraDateHorario(horario?.horaAbertura),
        horaFechamento: this.paraDateHorario(horario?.horaFechamento)
      });
    });
  }

  private montarRequestHorarios(): HorarioFuncionamentoRequest[] {
    return this.horariosForm.getRawValue().map((horario) => ({
      diaSemana: horario.diaSemana,
      ativo: horario.ativo,
      horaAbertura: horario.ativo ? this.formatarHorario(horario.horaAbertura) : null,
      horaFechamento: horario.ativo ? this.formatarHorario(horario.horaFechamento) : null
    }));
  }

  private validarHorarioFuncionamento(control: AbstractControl): ValidationErrors | null {
    const ativo = control.get('ativo')?.value === true;
    const abertura = control.get('horaAbertura')?.value as Date | null;
    const fechamento = control.get('horaFechamento')?.value as Date | null;

    if (!ativo) {
      return null;
    }

    if (!abertura || !fechamento) {
      return { horariosObrigatorios: true };
    }

    const aberturaMinutos = abertura.getHours() * 60 + abertura.getMinutes();
    const fechamentoMinutos = fechamento.getHours() * 60 + fechamento.getMinutes();

    return fechamentoMinutos > aberturaMinutos ? null : { horarioInvalido: true };
  }

  private paraDateHorario(horario: string | null | undefined): Date | null {
    if (!horario) {
      return null;
    }

    const [horas, minutos] = horario.split(':').map(Number);

    if (!Number.isFinite(horas) || !Number.isFinite(minutos)) {
      return null;
    }

    const data = new Date();
    data.setHours(horas, minutos, 0, 0);
    return data;
  }

  private formatarHorario(horario: Date | null): string | null {
    if (!horario) {
      return null;
    }

    const horas = String(horario.getHours()).padStart(2, '0');
    const minutos = String(horario.getMinutes()).padStart(2, '0');
    return `${horas}:${minutos}`;
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
        this.formulario.controls.endereco.controls.numero.markAsTouched();
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

  private tratarErro(error: HttpErrorResponse): void {
    const body = error.error;

    if (this.ehErroValidacao(body)) {
      this.mensagemErro.set(body.message || body.error || 'Erro de validacao.');
      this.errosValidacao.set(body.errors.map((erroCampo) => this.formatarErroCampo(erroCampo.fieldName, erroCampo.message)));
      return;
    }

    this.mensagemErro.set(this.extrairMensagemErro(error));
  }

  private extrairMensagemErro(error: HttpErrorResponse): string {
    const body = error.error;

    if (this.ehErroValidacao(body)) {
      return body.errors.map((erroCampo) => this.formatarErroCampo(erroCampo.fieldName, erroCampo.message)).join(' ');
    }

    if (this.ehErroPadrao(body)) {
      return body.message || body.error || 'Nao foi possivel concluir a operacao.';
    }

    return 'Nao foi possivel concluir a operacao.';
  }

  private formatarErroCampo(fieldName: string, message: string): string {
    const labels: Record<string, string> = {
      nome: 'Nome',
      slug: 'Slug',
      ativo: 'Ativo',
      'endereco.cep': 'CEP',
      'endereco.logradouro': 'Logradouro',
      'endereco.numero': 'Numero',
      'endereco.complemento': 'Complemento',
      'endereco.bairro': 'Bairro',
      'endereco.cidade': 'Cidade',
      'endereco.estado': 'Estado'
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
