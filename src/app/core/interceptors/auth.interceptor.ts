import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';

import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const message = inject(NzMessageService);
  const token = authService.obterToken();
  const isAuthPublicRequest = request.url.includes('/auth/login') ||
    request.url.includes('/auth/clientes') ||
    request.url.includes('/auth/unidades/') ||
    request.url.includes('/api/publico/');
  const isApiRequest = request.url.startsWith(environment.apiUrl);

  if (!token || isAuthPublicRequest || !isApiRequest) {
    return next(request);
  }

  const authenticatedRequest = request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        const rotaAtual = router.url;
        const rotaPublica = rotaAtual.startsWith('/checkout') ||
          rotaAtual.startsWith('/catalogo') ||
          rotaAtual.startsWith('/cardapio') ||
          rotaAtual.startsWith('/carrinho') ||
          rotaAtual.startsWith('/loja') ||
          rotaAtual.startsWith('/login');

        if (rotaPublica) {
          authService.limparSessao();
        } else {
          authService.encerrarSessaoExpirada(rotaAtual);
        }

        message.warning('Sua sessao expirou. Entre novamente para continuar.');
      }

      if (error instanceof HttpErrorResponse && error.status === 403) {
        message.warning('Seu usuario nao possui permissao para esta acao.');
      }

      return throwError(() => error);
    })
  );
};
