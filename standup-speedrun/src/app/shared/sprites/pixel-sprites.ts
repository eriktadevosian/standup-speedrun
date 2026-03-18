export interface PixelSprite {
  name: string;
  color: string;
  grid: number[][]; // 0=transparent, 1=color, 2=darker shade
}

export const SPRITES: PixelSprite[] = [
  { name: 'mug', color: '#f1c40f', grid: [
    [0,1,1,1,0],[0,1,0,1,1],[0,1,2,1,1],[0,1,1,1,0],[1,1,1,1,1]]},
  { name: 'laptop', color: '#3498db', grid: [
    [1,1,1,1,0],[1,0,0,1,0],[1,1,1,1,0],[0,2,2,0,0],[0,0,0,0,0]]},
  { name: 'heart', color: '#e74c3c', grid: [
    [0,1,0,1,0],[1,1,1,1,1],[1,1,1,1,1],[0,1,1,1,0],[0,0,1,0,0]]},
  { name: 'bug', color: '#2ecc71', grid: [
    [0,1,0,1,0],[1,1,1,1,1],[1,2,1,2,1],[1,1,1,1,1],[0,1,0,1,0]]},
  { name: 'rocket', color: '#e67e22', grid: [
    [0,0,1,0,0],[0,1,1,1,0],[0,1,2,1,0],[1,1,1,1,1],[1,0,0,0,1]]},
  { name: 'star', color: '#f1c40f', grid: [
    [0,0,1,0,0],[0,1,1,1,0],[1,1,1,1,1],[0,1,1,1,0],[0,1,0,1,0]]},
  { name: 'key', color: '#f39c12', grid: [
    [0,1,1,0,0],[0,1,1,0,0],[0,0,1,0,0],[0,1,1,1,0],[0,0,1,0,0]]},
  { name: 'bulb', color: '#f1c40f', grid: [
    [0,1,1,1,0],[1,2,0,2,1],[1,0,0,0,1],[0,1,1,1,0],[0,0,1,0,0]]},
  { name: 'gamepad', color: '#9b59b6', grid: [
    [0,0,0,0,0],[1,1,1,1,1],[1,2,1,2,1],[0,1,1,1,0],[0,0,0,0,0]]},
  { name: 'floppy', color: '#3498db', grid: [
    [1,1,1,1,1],[1,0,0,0,1],[1,1,1,1,1],[1,2,2,2,1],[1,1,1,1,1]]},
];

export function getRandomSprite(): PixelSprite {
  return SPRITES[Math.floor(Math.random() * SPRITES.length)];
}
