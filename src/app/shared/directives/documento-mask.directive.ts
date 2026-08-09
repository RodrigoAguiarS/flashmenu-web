import { Directive, ElementRef, HostListener, Input, OnDestroy, OnInit, Optional, inject } from '@angular/core';
import { NgControl } from '@angular/forms';
import { Subscription } from 'rxjs';

import { TipoDocumentoMask, aplicarMascaraDocumento } from '../utils/documento-mask.util';

@Directive({
  selector: 'input[appDocumentoMask]',
  standalone: true
})
export class DocumentoMaskDirective implements OnInit, OnDestroy {
  private readonly elementRef = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private valueChangesSubscription?: Subscription;

  @Input({ required: true }) appDocumentoMask!: TipoDocumentoMask;

  constructor(@Optional() private readonly ngControl: NgControl | null) {}

  ngOnInit(): void {
    queueMicrotask(() => this.aplicarMascara());
    this.valueChangesSubscription = this.ngControl?.valueChanges?.subscribe(() => this.aplicarMascara());
  }

  ngOnDestroy(): void {
    this.valueChangesSubscription?.unsubscribe();
  }

  @HostListener('input')
  onInput(): void {
    this.aplicarMascara();
  }

  @HostListener('blur')
  onBlur(): void {
    this.aplicarMascara();
  }

  private aplicarMascara(): void {
    const input = this.elementRef.nativeElement;
    const valorFormatado = aplicarMascaraDocumento(this.appDocumentoMask, input.value);

    input.value = valorFormatado;
    this.ngControl?.control?.setValue(valorFormatado, { emitEvent: false });
  }
}
