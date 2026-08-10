import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { EmpresaResponse } from '../../core/models/empresa.model';
import { EmpresaService } from '../../core/services/empresa.service';
import { TelefonePipe } from '../../shared/pipes/telefone.pipe';

@Component({
  selector: 'app-loja-publica',
  standalone: true,
  imports: [
    RouterLink,
    NzAlertModule,
    NzButtonModule,
    NzEmptyModule,
    NzIconModule,
    NzSpinModule,
    NzTagModule,
    TelefonePipe
  ],
  templateUrl: './loja-publica.component.html',
  styleUrl: './loja-publica.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LojaPublicaComponent implements OnInit {
  private readonly empresaService = inject(EmpresaService);

  protected readonly empresa = signal<EmpresaResponse | null>(null);
  protected readonly carregando = signal(false);
  protected readonly mensagemErro = signal<string | null>(null);
  protected readonly horariosVisiveis = signal(false);

  protected readonly iniciaisEmpresa = computed(() => {
    const nome = this.empresa()?.nomeFantasia?.trim();

    if (!nome) {
      return 'FM';
    }

    return nome
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('')
      .toUpperCase();
  });

  protected readonly telefoneWhatsApp = computed(() => this.normalizarTelefone(this.empresa()?.telefone));
  protected readonly linkWhatsApp = computed(() => {
    const telefone = this.telefoneWhatsApp();

    if (!telefone) {
      return null;
    }

    const texto = encodeURIComponent(`Ola, vim pelo FlashMenu e quero fazer um pedido na ${this.empresa()?.nomeFantasia ?? 'loja'}.`);
    return `https://wa.me/55${telefone}?text=${texto}`;
  });

  ngOnInit(): void {
    this.carregarEmpresa();
  }

  protected alternarHorarios(): void {
    this.horariosVisiveis.update((valor) => !valor);
  }

  protected compartilhar(): void {
    const empresa = this.empresa();
    const titulo = empresa?.nomeFantasia ?? 'FlashMenu';
    const url = window.location.href;

    if (navigator.share) {
      void navigator.share({
        title: titulo,
        text: `Veja o cardapio da ${titulo}`,
        url
      });
      return;
    }

    void navigator.clipboard?.writeText(url);
  }

  private carregarEmpresa(): void {
    this.carregando.set(true);
    this.mensagemErro.set(null);

    this.empresaService.buscarPublica().pipe(
      catchError((error: HttpErrorResponse) => {
        this.mensagemErro.set(this.extrairMensagemErro(error));
        return of(null);
      }),
      finalize(() => this.carregando.set(false))
    ).subscribe((empresa) => this.empresa.set(empresa));
  }

  private normalizarTelefone(telefone: string | null | undefined): string | null {
    const valor = telefone?.replace(/\D/g, '') ?? '';

    if (!valor) {
      return null;
    }

    return valor.startsWith('55') ? valor.substring(2) : valor;
  }

  private extrairMensagemErro(error: HttpErrorResponse): string {
    if (error.status === 401 || error.status === 403) {
      return 'As informacoes da loja ainda nao estao liberadas como rota publica no backend.';
    }

    return 'Nao foi possivel carregar as informacoes da loja.';
  }
}
