import * as State from './wallet-states/PlayerA';

export default class WalletEngineA {
  static setupWalletEngine({ myAddress, opponentAddress, myBalance, opponentBalance }) {
    const walletState = new State.WaitForApproval({
      myAddress,
      opponentAddress,
      myBalance,
      opponentBalance,
    });
    return new WalletEngineA(walletState);
  }

  state: any;

  constructor(state) {
    this.state = state;
  }

  transitionTo(state): State.PlayerAState {
    this.state = state;
    return state;
  }
  errorOccurred(message: string): State.PlayerAState {
    switch (this.state.constructor) {
      case State.WaitForApproval:
      case State.WaitForBlockchainDeploy:
        return this.transitionTo(new State.FundingFailed(message));
      default:
        return this.state;
    }
  }

  approve(): State.PlayerAState {
    if (this.state.constructor === State.WaitForApproval) {
      return this.transitionTo(new State.ReadyToDeploy());
    } else {
      return this.state;
    }
  }

  transactionConfirmed(adjudicator: string): State.PlayerAState {
    if (
      this.state.constructor === State.WaitForBlockchainDeploy ||
      this.state.constructor === State.FundingFailed
    ) {
      return this.transitionTo(new State.WaitForBToDeposit(adjudicator));
    } else {
      return this.state;
    }
  }

  transactionSent() {
    if (this.state.constructor === State.ReadyToDeploy) {
      return this.transitionTo(new State.WaitForBlockchainDeploy());
    } else {
      return this.state;
    }
  }

  receiveFundingEvent(): State.PlayerAState {
    if (this.state.constructor === State.WaitForBToDeposit) {
      return this.transitionTo(new State.Funded());
    } else {
      return this.state;
    }
  }
}
