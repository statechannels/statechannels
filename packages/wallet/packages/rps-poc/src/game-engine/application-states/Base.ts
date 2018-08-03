import { Channel } from 'fmg-core';

export default class BaseState {
  balances: number[];
  channel: Channel;
  stake: number;
  playerIndex: number; // overwritten by subclass

  constructor(params: {channel: Channel, stake: number, balances: number[]}) {
    this.balances = params.balances;
    this.channel = params.channel;
    this.stake = params.stake;
  }

  get myAddress() {
    return this.channel.participants[this.playerIndex];
  }

  get opponentAddress() {
    return this.channel.participants[1 - this.playerIndex];
  }

  get channelId() {
    return this.channel.id;
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
