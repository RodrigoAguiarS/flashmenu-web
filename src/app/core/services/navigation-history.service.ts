import { Location } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NavigationHistoryService {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly urlAnterior = signal<string | null>(null);
  private urlAtual = this.router.url;
  private iniciado = false;

  readonly podeVoltar = computed(() => this.urlAnterior() !== null);

  inicializar(): void {
    if (this.iniciado) {
      return;
    }

    this.iniciado = true;

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.registrarNavegacao(event.urlAfterRedirects));
  }

  voltar(): void {
    if (!this.podeVoltar()) {
      return;
    }

    this.location.back();
  }

  private registrarNavegacao(novaUrl: string): void {
    if (novaUrl === this.urlAtual) {
      return;
    }

    if (this.ehRotaInternaComLayout(this.urlAtual) && this.ehRotaInternaComLayout(novaUrl)) {
      this.urlAnterior.set(this.urlAtual);
    } else {
      this.urlAnterior.set(null);
    }

    this.urlAtual = novaUrl;
  }

  private ehRotaInternaComLayout(url: string): boolean {
    const rota = url.split('?')[0].split('#')[0];

    return rota !== '/' && !rota.startsWith('/login') && !rota.startsWith('/loja');
  }
}
