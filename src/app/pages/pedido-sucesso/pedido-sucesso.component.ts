import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzResultModule } from 'ng-zorro-antd/result';

import { PedidoResponse } from '../../core/models/pedido.model';
import { CarrinhoService } from '../../core/services/carrinho.service';
import { PedidoResumoFinanceiroComponent } from '../../shared/components/pedido-resumo-financeiro/pedido-resumo-financeiro.component';

@Component({
  selector: 'app-pedido-sucesso',
  standalone: true,
  imports: [RouterLink, NzButtonModule, NzResultModule, PedidoResumoFinanceiroComponent],
  templateUrl: './pedido-sucesso.component.html',
  styleUrl: './pedido-sucesso.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PedidoSucessoComponent {
  private readonly router = inject(Router);
  protected readonly carrinhoService = inject(CarrinhoService);
  protected readonly pedido = this.router.getCurrentNavigation()?.extras.state?.['pedido'] as PedidoResponse | undefined;
}
