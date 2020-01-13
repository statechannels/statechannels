export interface AutoPlayerAction {
  type: 'StartAutoPlayer' | 'StopAutoPlayer';
  player: 'A' | 'B';
}

export function startAutoPlayerA() {
  return {type: 'StartAutoPlayer', player: 'A'};
}

export function startAutoPlayerB() {
  return {type: 'StartAutoPlayer', player: 'B'};
}

export function stopAutoPlayerA() {
  return {type: 'StopAutoPlayer', player: 'A'};
}

export function stopAutoPlayerB() {
  return {type: 'StartAutoPlayer', player: 'B'};
}
