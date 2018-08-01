class BaseState {
  constructor({
    channel, stake, balances, playerIndex,
  }) {
    this._balances = balances;
    this._channel = channel;
    this.stake = stake;
    this._playerIndex = playerIndex;
  }

  get myAddress() {
    return this._channel.participants[this.playerIndex];
  }

  get opponentAddress() {
    return this._channel.participants[1 - this.playerIndex];
  }

  get channelId() {
    return this._channel.channelId;
  }

  get myBalance() {
    return this._balances[this.playerIndex];
  }

  get opponentBalance() {
    return this._balances[1 - this.playerIndex];
  }

  get commonAttributes() {
    return {
      balances: this._balances,
      channel: this._channel,
      stake: this.stake,
    };
  }

  get shouldSendMessage() {
    return false;
  }
}

class ReadyToSendConclude extends BaseState {
  constructor({
    channel,
    balances,
    adjudicator,
    signedConcludeMessage,
    playerIndex,
  }) {
    super({ channel, balances, playerIndex });
    this.adjudicator = adjudicator;
    this.message = signedConcludeMessage;
  }
}

class WaitForConclude extends BaseState {
  constructor({
    channel,
    balances,
    adjudicator,
    signedConcludeMessage,
    playerIndex,
  }) {
    super({
      channel, balances, playerIndex, adjudicator, message: signedConcludeMessage,
    });
  }
}

export { BaseState, ReadyToSendConclude, WaitForConclude }