import * as playerA from '../wallet-engine/wallet-states/PlayerA';
import * as playerB from '../wallet-engine/wallet-states/PlayerB';
import { WalletState } from '../redux/reducers/wallet-state';
import { PureComponent } from 'react';
import WalletLayout from './WalletLayout';
import FundingInProgress from './FundingInProgress';
import FundingError from './FundingError';
import React from 'react';

interface Props {
  walletState: WalletState;
  tryAgain: () => void;
}

export default class WalletController extends PureComponent<Props> {
  renderWallet() {
    const { walletState } = this.props;
    if (walletState === null) {
      return null;
    }

    switch (walletState && walletState.constructor) {
      case playerA.FundingFailed:
      case playerB.FundingFailed:
        const fundingErrorState = walletState as playerA.FundingFailed | playerB.FundingFailed;
        return <FundingError message={fundingErrorState.message} tryAgain={this.props.tryAgain} />;
      case playerA.WaitForBlockchainDeploy:
        return <FundingInProgress message="confirmation of adjudicator deployment" />;

      case playerA.WaitForBToDeposit:
        return <FundingInProgress message="confirmation of adjudicator deployment" />;

      case playerB.WaitForAToDeploy:
        return <FundingInProgress message="waiting for adjudicator to be deployed" />;

      case playerB.ReadyToDeposit:
        return <FundingInProgress message="ready to deposit funds" />;

      case playerB.WaitForBlockchainDeposit:
        return <FundingInProgress message="waiting for deposit confirmation" />;

      default:
        return (
          <FundingInProgress message={`[view not implemented: ${walletState.constructor.name}`} />
        );
    }
  }

  render() {
    return <WalletLayout>{this.renderWallet()}</WalletLayout>;
  }
}
