import { Pipe, PipeTransform } from '@angular/core';

import { formatarCpf } from '../utils/documento-mask.util';

@Pipe({
  name: 'cpf',
  standalone: true
})
export class CpfPipe implements PipeTransform {
  transform(value: string | number | null | undefined): string {
    return formatarCpf(value) || '-';
  }
}
