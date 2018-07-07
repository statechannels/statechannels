import Enum from 'enum';

import { brandColor } from './App.css';

export const BRAND_COLOR = brandColor;

export const ROUTE_PATHS = {
  HOW_IT_WORKS: 'how',
  PLAY: 'play',
  ABOUT: 'about',
};

export const AC_VIEWS = new Enum([
  // These map to the screens (bolded outlines) in the project's readme flow chart

  // Pre-setup states
  'SELECT_CHALLENGER',

  // Player B Setup states
  'CONFIRM_WAGER',

  // Player A Play states
  'SELECT_PLAY',

  // Player B Play states
  'SELECT_PLAY_AFTER_OPPONENT',

  // Play states used by both players
  'REVEAL_WINNER_WITH_PROMPT',

  // Conclude state used by both players
  'CONCLUDE_GAME',

  // general states
  'WAITING_FOR_PLAYER',
  'WAITING_FOR_CHAIN',
  'SENDING_MESSAGE',
  'GAME_CANCELLED_BY_YOU',
  'GAME_CANCELLED_BY_OPPONENT',
]);

export const GE_STAGES = new Enum([
  // Pre-setup states
  'SELECT_CHALLENGER',

  // Player A Setup states
  'READY_TO_SEND_PREFUND',
  'PREFUND_SENT',
  'READY_TO_DEPLOY_ADJUDICATOR',
  'DEPLOY_TRANSACTION_SENT',
  'ADJUDICATOR_DEPLOYED_SUCCESSFULLY',
  'READY_TO_SEND_POST_FUND_CONFIRMATION',
  'AWAITING_POST_FUND_CONFIRMATION_RESPONSE',

  // Player B Setup states
  // TODO: fill in these

  // Player A Play states
  'SELECT_PLAY',
  'READY_TO_SEND_PLAY',
  'AWAITING_OPPONENT_PLAY',
  'READY_TO_SEND_REVEAL',

  // Player B Play states
  // TODO: fill in these

  // Player A conclude states
  'AWAITING_ROUND_CONCLUSION',
  'ROUND_CONCLUDED',

  // End states
  'GAME_CANCELLED_BY_OPPONENT',
  'GAME_CANCELLED_BY_YOU',
  'GAME_CONCLUDED',
]);

export const GE_TO_AC_MAPPING = {
  // PRE setup state
  [GE_STAGES.SELECT_CHALLENGER]: AC_VIEWS.SELECT_CHALLENGER,

  // Player A Setup states
  [GE_STAGES.READY_TO_SEND_PREFUND]: AC_VIEWS.SENDING_MESSAGE,
  [GE_STAGES.PREFUND_SENT]: AC_VIEWS.WAITING_FOR_PLAYER,
  [GE_STAGES.READY_TO_DEPLOY_ADJUDICATOR]: AC_VIEWS.WAITING_FOR_CHAIN,
  [GE_STAGES.DEPLOY_TRANSACTION_SENT]: AC_VIEWS.WAITING_FOR_CHAIN,
  [GE_STAGES.ADJUDICATOR_DEPLOYED_SUCCESSFULLY]: AC_VIEWS.SENDING_MESSAGE,
  [GE_STAGES.READY_TO_SEND_POST_FUND_CONFIRMATION]: AC_VIEWS.SENDING_MESSAGE,
  [GE_STAGES.AWAITING_POST_FUND_CONFIRMATION_RESPONSE]: AC_VIEWS.WAITING_FOR_PLAYER,

  // Player B Setup states
  // TODO: fill in these

  // Player A Play states
  [GE_STAGES.SELECT_PLAY]: AC_VIEWS.SELECT_PLAY,
  [GE_STAGES.READY_TO_SEND_PLAY]: AC_VIEWS.SENDING_MESSAGE,
  [GE_STAGES.AWAITING_OPPONENT_PLAY]: AC_VIEWS.WAITING_FOR_PLAYER,
  [GE_STAGES.READY_TO_SEND_REVEAL]: AC_VIEWS.SENDING_MESSAGE,

  // Player B Play states
  // TODO: fill in these

  // Player A conclude states
  [GE_STAGES.AWAITING_ROUND_CONCLUSION]: AC_VIEWS.WAITING_FOR_PLAYER,
  [GE_STAGES.ROUND_CONCLUDED]: AC_VIEWS.REVEAL_WINNER_WITH_PROMPT,

  // End states
  [GE_STAGES.GAME_CONCLUDED]: AC_VIEWS.CONCLUDE_GAME,
  [GE_STAGES.GAME_CANCELLED_BY_YOU]: AC_VIEWS.GAME_CANCELLED_BY_YOU,
  [GE_STAGES.GAME_CANCELLED_BY_OPPONENT]: AC_VIEWS.GAME_CANCELLED_BY_OPPONENT,
};

export const GE_COMMANDS = new Enum([
  'SEND_PRE_FUND_MESSAGE',
  'SEND_POST_FUND_MESSAGE',
]);

export const PLAY_OPTIONS = [
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
