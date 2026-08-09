import { Pipe, PipeTransform } from '@angular/core';

import { formatarCnpj } from '../utils/documento-mask.util';

@Pipe({
  name: 'cnpj',
  standalone: true
})
export class CnpjPipe implements PipeTransform {
  transform(value: string | number | null | undefined): string {
    return formatarCnpj(value) || '-';
  }
}
