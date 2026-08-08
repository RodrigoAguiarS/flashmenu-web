import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzUploadFile, NzUploadModule } from 'ng-zorro-antd/upload';

import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { CategoriaResponse } from '../../../core/models/categoria.model';
import { ProdutoRequest } from '../../../core/models/produto.model';
import { CategoriaService } from '../../../core/services/categoria.service';
import { ProdutoService } from '../../../core/services/produto.service';

const TIPOS_IMAGEM_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANHO_MAXIMO_IMAGEM = 5 * 1024 * 1024;

@Component({
  selector: 'app-produto-form',
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
    NzInputNumberModule,
    NzSelectModule,
    NzSpinModule,
    NzUploadModule
  ],
  templateUrl: './produto-form.component.html',
  styleUrl: './produto-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProdutoFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly produtoService = inject(ProdutoService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly message = inject(NzMessageService);

  protected readonly idProduto = signal<number | null>(null);
  protected readonly categorias = signal<CategoriaResponse[]>([]);
  protected readonly carregando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly imagemSelecionada = signal<File | null>(null);
  protected readonly previewImagem = signal<string | null>(null);
  protected readonly imagemAtual = signal<string | null>(null);
  protected readonly arquivosUrlAtuais = signal<string[]>([]);
  protected readonly mensagemErro = signal<string | null>(null);
  protected readonly errosValidacao = signal<string[]>([]);
  protected readonly editando = computed(() => this.idProduto() !== null);
  protected readonly titulo = computed(() => this.editando() ? 'Editar produto' : 'Novo produto');
  protected readonly textoBotao = computed(() => this.editando() ? 'Salvar alteracoes' : 'Cadastrar produto');
  protected readonly imagemExibida = computed(() => this.previewImagem() ?? this.imagemAtual());

  protected readonly formulario = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    descricao: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(500)]],
    categoriaId: this.fb.control<number | null>(null, [Validators.required]),
    valorFornecedor: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    quantidadeEstoque: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)])
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      const idNumerico = Number(id);

      if (!Number.isInteger(idNumerico) || idNumerico <= 0) {
        this.message.error('Produto invalido.');
        void this.router.navigate(['/produtos']);
        return;
      }

      this.idProduto.set(idNumerico);
      this.carregarDadosEdicao(idNumerico);
      return;
    }

    this.carregarCategorias();
  }

  ngOnDestroy(): void {
    this.revogarPreviewAtual();
  }

  enviar(): void {
    this.mensagemErro.set(null);
    this.errosValidacao.set([]);

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const id = this.idProduto();
    const request = this.montarRequest();
    const imagem = this.imagemSelecionada();

    this.salvando.set(true);

    const operacao$ = id
      ? this.produtoService.atualizar(id, request, imagem)
      : this.produtoService.cadastrar(request, imagem);

    operacao$.pipe(
      finalize(() => this.salvando.set(false))
    ).subscribe({
      next: () => {
        this.message.success(id ? 'Produto atualizado com sucesso.' : 'Produto cadastrado com sucesso.');
        void this.router.navigate(['/produtos']);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  protected antesUpload = (arquivoUpload: NzUploadFile | File): boolean => {
    const arquivo = this.extrairArquivo(arquivoUpload);

    if (!arquivo) {
      this.message.error('Nao foi possivel ler a imagem selecionada.');
      return false;
    }

    if (!TIPOS_IMAGEM_PERMITIDOS.includes(arquivo.type)) {
      this.message.error('Selecione uma imagem JPG, PNG ou WEBP.');
      return false;
    }

    if (arquivo.size > TAMANHO_MAXIMO_IMAGEM) {
      this.message.error('A imagem deve ter no maximo 5 MB.');
      return false;
    }

    this.revogarPreviewAtual();
    this.imagemSelecionada.set(arquivo);
    this.previewImagem.set(URL.createObjectURL(arquivo));
    return false;
  };

  protected removerImagemSelecionada(): void {
    this.revogarPreviewAtual();
    this.imagemSelecionada.set(null);
    this.previewImagem.set(null);
  }

  private carregarCategorias(): void {
    this.carregando.set(true);

    this.categoriaService.listar({ page: 0, size: 100, sort: 'nome' }).pipe(
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: (page) => this.categorias.set(page.content.filter((categoria) => categoria.ativo)),
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  private carregarDadosEdicao(id: number): void {
    this.carregando.set(true);

    forkJoin({
      produto: this.produtoService.buscarPorId(id),
      categorias: this.categoriaService.listar({ page: 0, size: 100, sort: 'nome' })
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

      this.categorias.set(resultado.categorias.content.filter((categoria) => categoria.ativo));
      this.imagemAtual.set(resultado.produto.imagemUrl ?? resultado.produto.arquivosUrl?.[0] ?? null);
      this.arquivosUrlAtuais.set(resultado.produto.arquivosUrl ?? []);
      this.formulario.patchValue({
        nome: resultado.produto.nome,
        descricao: resultado.produto.descricao,
        categoriaId: resultado.produto.categoria.id,
        valorFornecedor: resultado.produto.valorFornecedor,
        quantidadeEstoque: resultado.produto.quantidadeEstoque
      });
    });
  }

  private montarRequest(): ProdutoRequest {
    const valor = this.formulario.getRawValue();

    return {
      nome: valor.nome.trim(),
      descricao: valor.descricao.trim(),
      categoriaId: valor.categoriaId ?? 0,
      valorFornecedor: valor.valorFornecedor ?? 0,
      arquivosUrl: this.arquivosUrlAtuais(),
      quantidadeEstoque: valor.quantidadeEstoque ?? 0
    };
  }

  private extrairArquivo(arquivoUpload: NzUploadFile | File): File | null {
    if (arquivoUpload instanceof File) {
      return arquivoUpload;
    }

    return arquivoUpload.originFileObj ?? null;
  }

  private revogarPreviewAtual(): void {
    const preview = this.previewImagem();

    if (preview) {
      URL.revokeObjectURL(preview);
    }
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
    const labels: Record<string, string> = {
      nome: 'Nome',
      descricao: 'Descricao',
      categoriaId: 'Categoria',
      valorFornecedor: 'Valor fornecedor',
      quantidadeEstoque: 'Estoque',
      imagem: 'Imagem'
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
