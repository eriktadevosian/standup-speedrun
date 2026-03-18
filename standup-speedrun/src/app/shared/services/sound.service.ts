import { Injectable, signal } from '@angular/core';

export type SoundEffect = 'answer_success' | 'block_missed' | 'attack_applied' | 'like_received' | 'game_start' | 'game_over' | 'confetti' | 'tick';

@Injectable({ providedIn: 'root' })
export class SoundService {
  isMuted = signal(false);

  play(sound: SoundEffect): void {
    if (this.isMuted()) return;
    try {
      const audio = new Audio(`/assets/sounds/${sound}.mp3`);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {}
  }

  toggleMute(): void {
    this.isMuted.update(v => !v);
  }
}
