import { Pipe, PipeTransform } from '@angular/core';

import { formatarTelefone } from '../utils/documento-mask.util';

@Pipe({
  name: 'telefone',
  standalone: true
})
export class TelefonePipe implements PipeTransform {
  transform(value: string | number | null | undefined): string {
    return formatarTelefone(value) || '-';
  }
}
