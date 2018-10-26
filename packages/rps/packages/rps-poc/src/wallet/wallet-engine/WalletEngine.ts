import BN from 'bn.js';

import * as PlayerA from './wallet-states/PlayerA';
import * as PlayerB from './wallet-states/PlayerB';
import { PlayerIndex } from './wallet-states';
import * as CommonState from './wallet-states';

type State = PlayerA.PlayerAState | PlayerB.PlayerBState;
interface WalletEngineSetup {
  myAddress: string;
  opponentAddress: string;
  myBalance: BN;
  opponentBalance: BN;
  playerIndex: PlayerIndex;
}

export default class WalletEngine {
  state: State;
  myAddress: string;
  opponentAddress: string;
  playerIndex: PlayerIndex;

  setup(args: WalletEngineSetup) {
    // const WaitForApproval = WaitForApproval<typeof playerIndex>;
    const walletState = new CommonState.WaitForApproval(args);

    this.state = walletState;
    this.myAddress = args.myAddress;
    this.opponentAddress = args.opponentAddress;
    this.playerIndex = args.playerIndex;

    return this;
  }

  approve(): State {
    if (this.state instanceof PlayerB.WaitForApprovalWithAdjudicator) {
      return this.transitionTo(new PlayerB.ReadyToDeposit(this.state.adjudicatorAddress, this.state.myBalance));
    }
    if (this.state instanceof CommonState.WaitForApproval && this.playerIndex === PlayerIndex.A) {
      return this.transitionTo(new PlayerA.ReadyToDeploy(this.state.myBalance));
    }
    if (this.state instanceof CommonState.WaitForApproval && this.playerIndex === PlayerIndex.B) {
      return this.transitionTo(new PlayerB.WaitForAToDeploy(this.state.myBalance));
    }
    return this.state;
  }

  transactionSent(): State {
    if (this.state instanceof PlayerA.ReadyToDeploy) {
      return this.transitionTo(new PlayerA.WaitForBlockchainDeploy(this.state.myBalance));
    }
    if (this.state instanceof PlayerB.ReadyToDeposit) {
      return this.transitionTo(new PlayerB.WaitForBlockchainDeposit(this.state.myBalance));
    }
    return this.state;
  }

  deployConfirmed(adjudicator: string): State {
    if (
      this.state instanceof PlayerA.WaitForBlockchainDeploy ||
      this.state instanceof PlayerA.FundingFailed
    ) {
      return this.transitionTo(new PlayerA.WaitForBToDeposit(adjudicator, this.state.myBalance));
    }
    if (this.state instanceof PlayerB.WaitForAToDeploy) {
      return this.transitionTo(new PlayerB.ReadyToDeposit(adjudicator, this.state.myBalance));
    }
    if (this.state instanceof PlayerB.WaitForApproval) {
      const { myAddress, opponentAddress, myBalance, opponentBalance } = this.state;
      return this.transitionTo(new PlayerB.WaitForApprovalWithAdjudicator({ myAddress, opponentAddress, myBalance, opponentBalance, adjudicatorAddress: adjudicator }));
    }

    return this.state;
  }

  fundingConfirmed(adjudicator: string): State {
    if (
      this.state instanceof PlayerB.WaitForBlockchainDeposit
    ) {
      return this.transitionTo(new PlayerB.Funded(adjudicator, this.state.myBalance));
    }

    return this.state;
  }

  receiveFundingEvent(): State {
    if (this.state instanceof PlayerA.WaitForBToDeposit) {
      return this.transitionTo(new PlayerA.Funded(this.state.adjudicatorAddress, this.state.myBalance));
    }

    return this.state;
  }

  requestWithdrawalAddress(): State {
    if (this.state instanceof CommonState.Funded) {
      return this.transitionTo(new CommonState.SelectWithdrawalAddress());
    }

    return this.state;
  }

  selectWithdrawalAddress(depositAddress: string): State {
    if (this.state instanceof CommonState.SelectWithdrawalAddress) {
      return this.transitionTo(new CommonState.WaitForWithdrawal(depositAddress));
    }

    return this.state;
  }

  transitionTo(state: State): State {
    this.state = state;
    return state;
  }

  fundingDeclined(): State {
    return this.transitionTo(new CommonState.FundingDeclined());
  }

  errorOccurred(message: string): State {
    if (
      this.state instanceof CommonState.WaitForApproval ||
      this.state instanceof PlayerA.WaitForBlockchainDeploy ||
      this.state instanceof PlayerB.WaitForBlockchainDeposit
    ) {
      return this.transitionTo(new CommonState.FundingFailed(message, this.state.myBalance));
    }

    return this.state;
  }
}
