import BaseState from '../Base';
import { Player } from '..';
import {
  Position,
  PreFundSetupB,
  PostFundSetupB,
  Propose,
  Accept,
  Resting,
  Conclude,
  calculateResult,
  Play,
} from '../../positions';

export enum PlayerBStateType {
  WAIT_FOR_POST_FUND_SETUP = 'PLAYER_B.WAIT_FOR_POST_FUND_SETUP',
  WAIT_FOR_PROPOSE = 'PLAYER_B.WAIT_FOR_PROPOSE',
  CHOOSE_PLAY = 'PLAYER_B.CHOOSE_PLAY',
  WAIT_FOR_REVEAL = 'PLAYER_B.WAIT_FOR_REVEAL',
  WAIT_FOR_CONCLUDE = 'PLAYER_B.WAIT_FOR_CONCLUDE',
  VIEW_RESULT = 'PLAYER_B.VIEW_RESULT',
  INSUFFICIENT_FUNDS = 'PLAYER_B.INSUFFICIENT_FUNDS',
  CONCLUDED = 'PLAYER_B.CONCLUDED',
  CONCLUDE_RECEIVED = 'PLAYER_B.CONCLUDE_RECEIVED',
}

class BasePlayerB<T extends Position> extends BaseState<T> {
  readonly player = Player.PlayerB;
}

export class WaitForPostFundSetup extends BasePlayerB<PreFundSetupB> {
  readonly type = PlayerBStateType.WAIT_FOR_POST_FUND_SETUP;
  readonly isReadyToSend = false;

  get stake() { return this.position.stake; }
}

export class WaitForPropose extends BasePlayerB<PostFundSetupB | Resting> {
  readonly type = PlayerBStateType.WAIT_FOR_PROPOSE;
  readonly isReadyToSend = false;

  get stake() { return this.position.stake; }
}

export class ChoosePlay extends BasePlayerB<Propose> {
  readonly type = PlayerBStateType.CHOOSE_PLAY;
  readonly isReadyToSend = false;

  get stake() { return this.position.stake; }
  get preCommit() { return this.position.preCommit; }
}

export class WaitForReveal extends BasePlayerB<Accept> {
  readonly type = PlayerBStateType.WAIT_FOR_REVEAL;
  readonly isReadyToSend = false;

  get stake() { return this.position.stake; }
  get bPlay() { return this.position.bPlay; }
  get preCommit() { return this.position.preCommit; }
}
export class ViewResult extends BasePlayerB<Resting> {
  readonly type = PlayerBStateType.VIEW_RESULT;
  readonly isReadyToSend = false;
  aPlay: Play;
  bPlay: Play;

  constructor({ position, aPlay, bPlay }) {
    super({ position });
    this.aPlay = aPlay;
    this.bPlay = bPlay;
  }

  get stake() { return this.position.stake; }
  get result() { return calculateResult(this.bPlay, this.aPlay); }
}

// todo: what should Position be here?
export class InsufficientFunds extends BasePlayerB<Position> {
  readonly type = PlayerBStateType.INSUFFICIENT_FUNDS;
  readonly isReadyToSend = false;
}

export class WaitForConclude extends BasePlayerB<Conclude> {
  readonly type = PlayerBStateType.WAIT_FOR_CONCLUDE;
  readonly isReadyToSend = false;
}
export class ConcludeReceived extends BasePlayerB<Conclude> {
  readonly type = PlayerBStateType.CONCLUDE_RECEIVED;
  readonly isReadyToSend = false;
}
export class Concluded extends BasePlayerB<Conclude> {
  readonly type = PlayerBStateType.CONCLUDED;
  readonly isReadyToSend = false;
}

export type PlayerBState = (
  | WaitForPostFundSetup
  | ChoosePlay
  | WaitForPropose
  | WaitForReveal
  | ViewResult
  | InsufficientFunds
  | WaitForConclude
  | ConcludeReceived
  | Concluded
);
