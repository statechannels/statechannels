import BasePlayerA from './Base';
import Move from '../../Move';
import { Play, Result } from '../../positions';

export default class WaitForResting extends BasePlayerA {
  move: Move;
  aPlay: Play;
  bPlay: Play;
  result: Result;
  salt: string;
  adjudicator: string;
  readonly isReadyToSend = false;

  constructor({ channel, stake, balances, adjudicator, aPlay, bPlay, result, salt, move }) {
    super({ channel, stake, balances });
    this.move = move;
    this.aPlay = aPlay;
    this.bPlay = bPlay;
    this.result = result; // win/lose/draw
    this.salt = salt;
    this.adjudicator = adjudicator;
  }
}
