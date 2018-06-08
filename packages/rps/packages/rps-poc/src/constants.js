import { brandColor } from './App.css';

export const BRAND_COLOR = brandColor;

export const ROUTE_PATHS = {
  HOW_IT_WORKS: 'how',
  PLAY: 'play',
  ABOUT: 'about',
};

// TODO: use key mirror
export const GAME_STAGES = {
  SELECT_CHALLENGER: 0,
  SELECT_MOVE: 1,
  WAIT_FOR_OPPONENT_MOVE: 2,
};

export const MOVE_OPTIONS = [
  {
    name: 'ROCK',
    id: 0,
  },
  {
    name: 'PAPER',
    id: 1,
  },
  {
    name: 'SCISSORS',
    id: 2,
  },
];
