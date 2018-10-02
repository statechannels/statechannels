import * as State from './wallet-states/PlayerB';

export default class WalletEngineB {
  static setupWalletEngine({ myAddress, opponentAddress, myBalance, opponentBalance }) {
    const walletState = new State.WaitForApproval({ myAddress, opponentAddress, myBalance, opponentBalance });
    return new WalletEngineB(walletState);
  }
  state: any;

  constructor(state) {
    this.state = state;
  }

  approve(): State.PlayerBState {
    switch (this.state.constructor) {
      case State.WaitForApproval:
        return this.transitionTo(new State.WaitForAToDeploy());
      case State.WaitForApprovalWithAdjudicator:
        return this.transitionTo(new State.ReadyToDeposit(this.state.adjudicatorAddress));
      default:
        return this.state;
    }
  }

  errorOccurred(message: string): State.PlayerBState {
    if (this.state.constructor === State.ReadyToDeposit) {
      return this.transitionTo(new State.FundingFailed(message));
    } else {
      return this.state;
    }
  }

  deployConfirmed(adjudicator): State.PlayerBState {
    switch (this.state.constructor) {
      case State.WaitForAToDeploy:
        return this.transitionTo(new State.ReadyToDeposit(adjudicator));
      case State.WaitForApproval:
        return this.transitionTo(
          new State.WaitForApprovalWithAdjudicator({ adjudicatorAddress: adjudicator, ...this.state }),
        );
      default:
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
      return this.transitionTo(new State.WaitForBlockchainDeposit());
    } else {
      return this.state;
    }
  }

  transitionTo(state): State.PlayerBState {
    this.state = state;
    return state;
  }
}
