import Enum from 'enum';

import { brandColor } from './App.css';

export const BRAND_COLOR = brandColor;

export const ROUTE_PATHS = {
  HOW_IT_WORKS: 'how',
  PLAY: 'play',
  ABOUT: 'about',
};

export const GAME_STAGES = new Enum([
  'SELECT_CHALLENGER',
  'SELECT_MOVE',
  'WAIT_FOR_OPPONENT_MOVE',
]);

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
