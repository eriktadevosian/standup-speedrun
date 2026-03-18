import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PlayerService } from '../services/player.service';
import { WebSocketService } from '../services/websocket.service';

export const connectedGuard: CanActivateFn = () => {
  const player = inject(PlayerService);
  const ws = inject(WebSocketService);
  const router = inject(Router);

  if (player.sessionId() && ws.connectionState() === 'connected') {
    return true;
  }

  if (player.restore() && player.sessionId()) {
    return true;
  }

  return router.createUrlTree(['/']);
};
