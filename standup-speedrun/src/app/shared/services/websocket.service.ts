import { Injectable, signal, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { ConfigService } from './config.service';
import { WsClientEvent, WsServerEvent } from '../models/ws-events.model';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private config = inject(ConfigService);
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnects = 3;
  private buffer: WsClientEvent[] = [];
  private sessionId = '';
  private playerName?: string;

  connectionState = signal<'connecting' | 'connected' | 'disconnected'>('disconnected');

  private messagesSubject = new Subject<WsServerEvent>();
  messages$ = this.messagesSubject.asObservable();

  connect(sessionId: string, playerName?: string): void {
    this.sessionId = sessionId;
    this.playerName = playerName;
    this.reconnectAttempts = 0;
    this.doConnect();
  }

  disconnect(): void {
    this.reconnectAttempts = this.maxReconnects;
    this.ws?.close();
    this.ws = null;
    this.connectionState.set('disconnected');
  }

  send(event: WsClientEvent): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    } else {
      this.buffer.push(event);
    }
  }

  private doConnect(): void {
    this.connectionState.set('connecting');
    const nameParam = this.playerName ? `?name=${encodeURIComponent(this.playerName)}` : '?name=__screen__';
    const url = `${this.config.wsUrl}/ws/${this.sessionId}${nameParam}`;
    console.log('[WS] Connecting to:', url);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[WS] Connected');
      this.connectionState.set('connected');
      this.reconnectAttempts = 0;
      this.flushBuffer();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WsServerEvent;
        this.messagesSubject.next(data);
      } catch { /* ignore malformed */ }
    };

    this.ws.onclose = (event) => {
      console.log('[WS] Closed:', event.code, event.reason);
      this.connectionState.set('disconnected');
      this.tryReconnect();
    };

    this.ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      this.ws?.close();
    };
  }

  private tryReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnects) return;
    const delay = Math.pow(2, this.reconnectAttempts) * 1000;
    this.reconnectAttempts++;
    setTimeout(() => this.doConnect(), delay);
  }

  private flushBuffer(): void {
    while (this.buffer.length > 0) {
      const event = this.buffer.shift()!;
      this.send(event);
    }
  }
}
