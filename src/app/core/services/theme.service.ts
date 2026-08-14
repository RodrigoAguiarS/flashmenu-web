import { DOCUMENT } from '@angular/common';
import { Injectable, Signal, computed, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemePreference = ThemeMode;

const THEME_KEY = 'flashmenu_theme';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly temaAtual = signal<ThemePreference>('light');
  private readonly preferenciaAtual = signal<ThemePreference>('system');

  readonly tema: Signal<ThemePreference> = computed(() => this.temaAtual());
  readonly preferencia: Signal<ThemePreference> = computed(() => this.preferenciaAtual());

  definirTema(preferencia: ThemePreference): void {
    this.preferenciaAtual.set(preferencia);
    this.temaAtual.set(preferencia);
    localStorage.setItem(THEME_KEY, preferencia);
    this.aplicarTema(preferencia);
  }

  alternarTema(): void {
    const ordem: ThemePreference[] = ['light', 'dark', 'system'];
    const indiceAtual = ordem.indexOf(this.preferenciaAtual());
    this.definirTema(ordem[(indiceAtual + 1) % ordem.length]);
  }

  inicializarTema(): void {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const preferencia = this.ehPreferenciaValida(savedTheme) ? savedTheme : 'system';

    this.preferenciaAtual.set(preferencia);
    this.temaAtual.set(preferencia);
    this.aplicarTema(preferencia);
  }

  private aplicarTema(theme: ThemePreference): void {
    const root = this.document.documentElement;

    root.classList.remove('theme-light', 'theme-dark', 'theme-system');
    root.classList.add(`theme-${theme}`);
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-theme-preference', theme);
  }

  private ehPreferenciaValida(value: string | null): value is ThemePreference {
    return value === 'light' || value === 'dark' || value === 'system';
  }
}
