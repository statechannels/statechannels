import { Channel } from 'fmg-core';
import Message from '../Message';

export default class BaseState {
  balances: number[];
  channel: Channel;
  stake: number;
  playerIndex: number;
  message: Message | undefined;

  constructor(
    channel, stake, balances, playerIndex, message?: Message
  ) {
    this.balances = balances;
    this.channel = channel;
    this.stake = stake;
    this.playerIndex = playerIndex;
    this.message = message;
  }

  get myAddress() {
    return this.channel.participants[this.playerIndex];
  }

  get opponentAddress() {
    return this.channel.participants[1 - this.playerIndex];
  }

  get channelId() {
    return this.channel.channelId;
  }

  get myBalance() {
    return this.balances[this.playerIndex];
  }

  get opponentBalance() {
    return this.balances[1 - this.playerIndex];
  }

  get commonAttributes() {
    return {
      balances: this.balances,
      channel: this.channel,
      stake: this.stake,
    };
  }

  get shouldSendMessage() {
    return false;
  }
}
