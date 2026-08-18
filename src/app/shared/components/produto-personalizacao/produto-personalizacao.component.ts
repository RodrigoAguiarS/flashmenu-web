import { CurrencyPipe } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild,
  computed,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { ComplementoSelecionado, GrupoComplementoResponse, OpcaoComplementoResponse } from '../../../core/models/complemento.model';
import { ProdutoCarrinho } from '../../../core/models/carrinho.model';
import { ProdutoResponse } from '../../../core/models/produto.model';

export interface ProdutoPersonalizacaoConfirmacao {
  quantidade: number;
  observacao: string | null;
  complementos: ComplementoSelecionado[];
  valorEstimado: number;
}

@Component({
  selector: 'app-produto-personalizacao',
  standalone: true,
  imports: [
    CurrencyPipe,
    FormsModule,
    NzAlertModule,
    NzButtonModule,
    NzEmptyModule,
    NzIconModule,
    NzInputModule,
    NzInputNumberModule,
    NzTagModule
  ],
  templateUrl: './produto-personalizacao.component.html',
  styleUrl: './produto-personalizacao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProdutoPersonalizacaoComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input({ required: true }) produto!: ProdutoResponse | ProdutoCarrinho;
  @Input() gruposComplementos: GrupoComplementoResponse[] = [];
  @Input() configuracaoInicial: ComplementoSelecionado[] = [];
  @Input() quantidadeInicial = 1;
  @Input() observacaoInicial: string | null = null;
  @Input() estoqueMaximo = 999;
  @Input() textoConfirmar = 'Adicionar ao carrinho';
  @Input() carregando = false;
  @Input() mostrarProdutoTopo = true;
  @Output() confirmar = new EventEmitter<ProdutoPersonalizacaoConfirmacao>();
  @ViewChild('resumoFooter') private readonly resumoFooter?: ElementRef<HTMLElement>;

  protected readonly quantidades = signal<Record<number, number>>({});
  protected readonly quantidadeItem = signal(1);
  protected readonly observacao = signal('');
  protected readonly alturaFooterMobile = signal(176);
  private readonly gruposComplementosState = signal<GrupoComplementoResponse[]>([]);
  private observadorFooter?: ResizeObserver;

  protected readonly gruposAtivos = computed(() =>
    [...this.gruposComplementosState()]
      .filter((grupo) => grupo.ativo)
      .map((grupo) => ({
        ...grupo,
        opcoes: [...(grupo.opcoes ?? [])]
          .filter((opcao) => opcao.ativo)
          .sort((a, b) => a.ordem - b.ordem || a.id - b.id)
      }))
      .sort((a, b) => a.ordem - b.ordem || a.id - b.id)
  );

  protected readonly complementosSelecionados = computed(() =>
    this.gruposAtivos().flatMap((grupo) =>
      (grupo.opcoes ?? [])
        .map((opcao) => ({ grupo, opcao, quantidade: this.quantidadeOpcao(opcao.id) }))
        .filter((item) => item.quantidade > 0)
        .map(({ grupo, opcao, quantidade }) => ({
          opcaoComplementoId: opcao.id,
          quantidade,
          nome: opcao.nome,
          valorAdicional: Number(opcao.valorAdicional ?? 0),
          grupoComplementoId: grupo.id
        }))
    )
  );

  protected readonly valorComplementos = computed(() =>
    this.complementosSelecionados().reduce(
      (total, complemento) => total + complemento.valorAdicional * complemento.quantidade,
      0
    )
  );

  protected readonly valorUnitarioEstimado = computed(() => Number(this.produto?.valorVenda ?? 0) + this.valorComplementos());
  protected readonly valorTotalEstimado = computed(() => this.valorUnitarioEstimado() * this.quantidadeItem());
  protected readonly configuracaoValida = computed(() => this.gruposAtivos().every((grupo) => this.grupoValido(grupo)));
  protected readonly possuiGrupos = computed(() => this.gruposAtivos().some((grupo) => (grupo.opcoes ?? []).length > 0));

  ngOnChanges(): void {
    this.gruposComplementosState.set(this.gruposComplementos);

    const quantidades = this.configuracaoInicial.reduce<Record<number, number>>((acc, complemento) => {
      acc[complemento.opcaoComplementoId] = complemento.quantidade;
      return acc;
    }, {});

    this.quantidades.set(quantidades);
    this.quantidadeItem.set(Math.max(1, Math.trunc(this.quantidadeInicial || 1)));
    this.observacao.set((this.observacaoInicial ?? '').substring(0, 255));
  }

  ngAfterViewInit(): void {
    const elementoFooter = this.resumoFooter?.nativeElement;
    if (!elementoFooter) {
      return;
    }

    const atualizarAlturaFooter = () => {
      this.alturaFooterMobile.set(Math.ceil(elementoFooter.getBoundingClientRect().height) + 12);
    };

    atualizarAlturaFooter();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    this.observadorFooter = new ResizeObserver(() => atualizarAlturaFooter());
    this.observadorFooter.observe(elementoFooter);
  }

  ngOnDestroy(): void {
    this.observadorFooter?.disconnect();
  }

  protected quantidadeOpcao(opcaoId: number): number {
    return this.quantidades()[opcaoId] ?? 0;
  }

  protected quantidadeGrupo(grupo: GrupoComplementoResponse): number {
    return (grupo.opcoes ?? []).reduce((total, opcao) => total + this.quantidadeOpcao(opcao.id), 0);
  }

  protected grupoValido(grupo: GrupoComplementoResponse): boolean {
    const quantidade = this.quantidadeGrupo(grupo);
    return quantidade >= grupo.quantidadeMinima && quantidade <= grupo.quantidadeMaxima;
  }

  protected mensagemGrupo(grupo: GrupoComplementoResponse): string {
    if (grupo.quantidadeMinima === grupo.quantidadeMaxima) {
      return `Escolha ${grupo.quantidadeMaxima}`;
    }

    if (grupo.quantidadeMinima > 0) {
      return `Escolha de ${grupo.quantidadeMinima} a ${grupo.quantidadeMaxima}`;
    }

    return `Escolha ate ${grupo.quantidadeMaxima}`;
  }

  protected selecionarUnico(grupo: GrupoComplementoResponse, opcao: OpcaoComplementoResponse): void {
    this.quantidades.update((quantidades) => {
      const proximas = { ...quantidades };
      (grupo.opcoes ?? []).forEach((opcaoGrupo) => delete proximas[opcaoGrupo.id]);
      proximas[opcao.id] = 1;
      return proximas;
    });
  }

  protected incrementar(grupo: GrupoComplementoResponse, opcao: OpcaoComplementoResponse): void {
    const quantidadeAtual = this.quantidadeOpcao(opcao.id);

    if (quantidadeAtual >= opcao.quantidadeMaxima || this.quantidadeGrupo(grupo) >= grupo.quantidadeMaxima) {
      return;
    }

    this.quantidades.update((quantidades) => ({
      ...quantidades,
      [opcao.id]: quantidadeAtual + 1
    }));
  }

  protected decrementar(opcao: OpcaoComplementoResponse): void {
    const quantidadeAtual = this.quantidadeOpcao(opcao.id);

    if (quantidadeAtual <= 0) {
      return;
    }

    this.quantidades.update((quantidades) => {
      const proximas = { ...quantidades };
      const novaQuantidade = quantidadeAtual - 1;

      if (novaQuantidade > 0) {
        proximas[opcao.id] = novaQuantidade;
      } else {
        delete proximas[opcao.id];
      }

      return proximas;
    });
  }

  protected podeIncrementar(grupo: GrupoComplementoResponse, opcao: OpcaoComplementoResponse): boolean {
    return this.quantidadeOpcao(opcao.id) < opcao.quantidadeMaxima && this.quantidadeGrupo(grupo) < grupo.quantidadeMaxima;
  }

  protected alterarQuantidadeItem(quantidade: number | null): void {
    const valor = Math.max(1, Math.trunc(quantidade ?? 1));
    this.quantidadeItem.set(Math.min(valor, this.estoqueMaximo));
  }

  protected alterarObservacao(observacao: string): void {
    this.observacao.set((observacao ?? '').substring(0, 255));
  }

  protected confirmarConfiguracao(): void {
    if (!this.configuracaoValida()) {
      return;
    }

    const observacao = this.observacao().trim();
    this.confirmar.emit({
      quantidade: this.quantidadeItem(),
      observacao: observacao || null,
      complementos: this.complementosSelecionados(),
      valorEstimado: this.valorUnitarioEstimado()
    });
  }
}
