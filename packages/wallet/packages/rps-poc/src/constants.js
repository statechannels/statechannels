import Enum from 'enum';

import { brandColor } from './App.css';

export const BRAND_COLOR = brandColor;

export const ROUTE_PATHS = {
  HOW_IT_WORKS: 'how',
  PLAY: 'play',
  ABOUT: 'about',
};

export const GAME_STAGES = new Enum([
  // These map to the screens (bolded outlines) in the project's readme flow chart

  // PRE setup state
  'SELECT_CHALLENGER',

  // Player A Setup states
  'INITIALIZE_SETUP',
  'CHOOSE_WAGER',
  'GAME_ACCEPT_RECEIVED',

  // Player B Setup states
  'CONFIRM_WAGER',

  // Player A Play states
  'SELECT_MOVE',

  // Player B Play states
  'SELECT_MOVE_AFTER_OPPONENT',

  // Play states used by both players
  'REVEAL_WINNER_WITH_PROMPT',

  // Conclude state used by both players
  'CONLUDE_GAME',

  // general states
  'WAITING_FOR_PLAYER',
  'WAITING_FOR_CHAIN',
  'GAME_CANCELLED_BY_YOU',
  'GAME_CANCELLED_BY_OPPONENT',
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
