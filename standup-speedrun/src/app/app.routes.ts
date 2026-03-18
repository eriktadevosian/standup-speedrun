import { Routes } from '@angular/router';
import { connectedGuard } from './shared/guards/connected.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./lobby/join.component').then(m => m.JoinComponent) },
  { path: 'lobby', loadComponent: () => import('./lobby/lobby.component').then(m => m.LobbyComponent), canActivate: [connectedGuard] },
  { path: 'play', loadComponent: () => import('./game/play.component').then(m => m.PlayComponent), canActivate: [connectedGuard] },
  { path: 'screen', loadComponent: () => import('./game/screen.component').then(m => m.ScreenComponent) },
  { path: 'results', loadComponent: () => import('./results/results.component').then(m => m.ResultsComponent), canActivate: [connectedGuard] },
  { path: '**', redirectTo: '' },
];
