import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';

interface ProdutoResumo {
  nome: string;
  categoria: string;
  estoque: number;
  status: 'Ativo' | 'Promocao' | 'Baixo estoque';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NzStatisticModule, NzTableModule, NzTagModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Dashboard {
  protected readonly produtos: ProdutoResumo[] = [
    { nome: 'Refrigerante lata', categoria: 'Bebidas', estoque: 36, status: 'Ativo' },
    { nome: 'Combo executivo', categoria: 'Combos', estoque: 12, status: 'Promocao' },
    { nome: 'Hamburguer artesanal', categoria: 'Lanches', estoque: 4, status: 'Baixo estoque' }
  ];
}
