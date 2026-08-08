import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzTableModule } from 'ng-zorro-antd/table';

interface ProdutoResumo {
  nome: string;
  categoria: string;
  estoque: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NzStatisticModule, NzTableModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Dashboard {
  protected readonly produtos: ProdutoResumo[] = [
    { nome: 'Refrigerante lata', categoria: 'Bebidas', estoque: 36 },
    { nome: 'Combo executivo', categoria: 'Combos', estoque: 12 },
    { nome: 'Hamburguer artesanal', categoria: 'Lanches', estoque: 4 }
  ];
}
