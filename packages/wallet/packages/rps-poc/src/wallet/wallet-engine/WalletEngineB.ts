import * as State from './wallet-states/PlayerB';

export default class WalletEngineB {
  static setupWalletEngine(): WalletEngineB {
    const walletState = new State.WaitForAToDeploy();
    return new WalletEngineB(walletState);
  }
  state: any;

  constructor(state) {
    this.state = state;
  }

  approve() {
    return this.state;
  }

  errorOccurred(message: string): State.PlayerBState {
    if (this.state.constructor === State.ReadyToDeposit) {
      return this.transitionTo(new State.FundingFailed(message));
    } else {
      return this.state;
    }
  }

  deployConfirmed(adjudicator): State.PlayerBState {
    if (this.state.constructor === State.WaitForAToDeploy) {
      return this.transitionTo(new State.ReadyToDeposit(adjudicator));
    } else {
      return this.state;
    }
  }

  transactionConfirmed(): State.PlayerBState {
    if (
      this.state.constructor === State.WaitForBlockchainDeposit ||
      this.state.constructor === State.FundingFailed
    ) {
      return this.transitionTo(new State.Funded());
    } else {
      return this.state;
    }
  }

  transactionSent() {
    if (this.state.constructor === State.ReadyToDeposit) {
      const { adjudicator } = this.state;
      return this.transitionTo(new State.WaitForBlockchainDeposit(adjudicator));
    } else {
      return this.state;
    }
  }

  transitionTo(state): State.PlayerBState {
    this.state = state;
    return state;
  }
}
