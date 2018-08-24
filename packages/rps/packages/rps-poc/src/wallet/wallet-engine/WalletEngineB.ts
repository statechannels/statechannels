import { Wallet } from '..';
import * as State from './wallet-states/PlayerB';
export default class WalletEngineB {
  static setupWalletEngine(wallet: Wallet, transaction: any): WalletEngineB {
    const walletState = new State.WaitForAToDeploy({ transaction });
    return new WalletEngineB(wallet, walletState);
  }
  wallet: Wallet;
  state: any;

  constructor(wallet, state) {
    this.wallet = wallet;
    this.state = state;
  }

  receiveEvent(event): State.PlayerBState {
    switch (this.state.constructor) {
      case State.WaitForAToDeploy:
        const { adjudicator } = event;
        const { transaction } = this.state;
        return this.transitionTo(new State.ReadyToDeposit({ adjudicator, transaction }));
      case State.WaitForBlockchainDeposit:
        const stateAdjudicator = this.state.adjudicator;
        return this.transitionTo(new State.Funded({ adjudicator: stateAdjudicator }));
      default:
        return this.state;
    }
  }

  transactionSent() {
    if (this.state.constructor === State.ReadyToDeposit) {
      const { adjudicator } = this.state;
      return this.transitionTo(new State.WaitForBlockchainDeposit({ adjudicator }));
    } else {
      return this.state;
    }
  }

  transitionTo(state): State.PlayerBState {
    this.state = state;
    return state;
  }
}
