import { DOCUMENT } from '@angular/common';
import { Injectable, Signal, computed, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';
export type ThemePreference = ThemeMode | 'system';

const THEME_KEY = 'flashmenu_theme';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly temaAtual = signal<ThemeMode>('light');
  private readonly preferenciaAtual = signal<ThemePreference>('system');

  readonly tema: Signal<ThemeMode> = computed(() => this.temaAtual());
  readonly preferencia: Signal<ThemePreference> = computed(() => this.preferenciaAtual());

  definirTema(preferencia: ThemePreference): void {
    const tema = preferencia === 'system' ? this.obterTemaPreferido() : preferencia;

    this.preferenciaAtual.set(preferencia);
    this.temaAtual.set(tema);
    localStorage.setItem(THEME_KEY, preferencia);
    this.aplicarTema(tema, preferencia);
  }

  alternarTema(): void {
    const ordem: ThemePreference[] = ['light', 'dark', 'system'];
    const indiceAtual = ordem.indexOf(this.preferenciaAtual());
    this.definirTema(ordem[(indiceAtual + 1) % ordem.length]);
  }

  inicializarTema(): void {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const preferencia = this.ehPreferenciaValida(savedTheme) ? savedTheme : 'system';
    const nextTheme = preferencia === 'system' ? this.obterTemaPreferido() : preferencia;

    this.preferenciaAtual.set(preferencia);
    this.temaAtual.set(nextTheme);
    this.aplicarTema(nextTheme, preferencia);
    this.observarPreferenciaSistema();
  }

  private aplicarTema(theme: ThemeMode, preferencia: ThemePreference): void {
    const root = this.document.documentElement;

    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add(`theme-${theme}`);
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-theme-preference', preferencia);
  }

  private obterTemaPreferido(): ThemeMode {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private observarPreferenciaSistema(): void {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    media.addEventListener('change', () => {
      if (this.preferenciaAtual() !== 'system') {
        return;
      }

      const tema = this.obterTemaPreferido();
      this.temaAtual.set(tema);
      this.aplicarTema(tema, 'system');
    });
  }

  private ehPreferenciaValida(value: string | null): value is ThemePreference {
    return value === 'light' || value === 'dark' || value === 'system';
  }
}
