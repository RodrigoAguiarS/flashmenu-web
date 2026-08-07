import { DOCUMENT } from '@angular/common';
import { Injectable, Signal, computed, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const THEME_KEY = 'flashmenu_theme';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly temaAtual = signal<ThemeMode>('light');

  readonly tema: Signal<ThemeMode> = computed(() => this.temaAtual());

  definirTema(theme: ThemeMode): void {
    this.temaAtual.set(theme);
    localStorage.setItem(THEME_KEY, theme);
    this.aplicarTema(theme);
  }

  alternarTema(): void {
    this.definirTema(this.temaAtual() === 'light' ? 'dark' : 'light');
  }

  inicializarTema(): void {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const nextTheme = this.ehTemaValido(savedTheme) ? savedTheme : this.obterTemaPreferido();

    this.temaAtual.set(nextTheme);
    this.aplicarTema(nextTheme);
  }

  private aplicarTema(theme: ThemeMode): void {
    const root = this.document.documentElement;

    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add(`theme-${theme}`);
    root.setAttribute('data-theme', theme);
  }

  private obterTemaPreferido(): ThemeMode {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private ehTemaValido(value: string | null): value is ThemeMode {
    return value === 'light' || value === 'dark';
  }
}
