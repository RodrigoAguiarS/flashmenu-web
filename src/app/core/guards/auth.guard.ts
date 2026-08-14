import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.estaAutenticado()) {
    return router.createUrlTree(['/login'], {
      queryParams: {
        returnUrl: state.url
      }
    });
  }

  const permissoes = route.data['permissoes'];
  const perfis = route.data['perfis'];

  if (Array.isArray(perfis) && !authService.possuiAlgumPerfil(perfis)) {
    return router.createUrlTree(['/catalogo']);
  }

  if (!Array.isArray(permissoes) || authService.possuiAlgumaPermissao(permissoes)) {
    return true;
  }

  return router.createUrlTree(['/catalogo']);
};
