import { Routes } from '@angular/router';

import { Dashboard } from './pages/dashboard/dashboard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then((component) => component.LoginComponent)
  },
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard]
  },
  {
    path: 'usuarios',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/usuarios/usuario-list/usuario-list.component').then((component) => component.UsuarioListComponent)
  },
  {
    path: 'usuarios/novo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/usuarios/usuario-form/usuario-form.component').then((component) => component.UsuarioFormComponent)
  },
  {
    path: 'usuarios/:id/editar',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/usuarios/usuario-form/usuario-form.component').then((component) => component.UsuarioFormComponent)
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard'
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
