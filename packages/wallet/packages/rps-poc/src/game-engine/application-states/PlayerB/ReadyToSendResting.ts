import BasePlayerB from './Base';
import Message from '../../Message';
import { Play, Result } from '../../positions';

export default class ReadyToSendResting extends BasePlayerB {
  message: Message;
  aPlay: Play;
  bPlay: Play;
  result: Result;
  salt: string;
  adjudicator: string;

  constructor({ channel, stake, balances, adjudicator, aPlay, bPlay, result, salt, message }) { 
    super({ channel, stake, balances });
    this.message = message;
    this.aPlay = aPlay;
    this.bPlay = bPlay;
    this.result = result; // win/lose/draw
    this.salt = salt;
    this.adjudicator = adjudicator;
  }
}
