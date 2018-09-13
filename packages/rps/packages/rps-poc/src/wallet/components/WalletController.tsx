import * as playerA from '../wallet-engine/wallet-states/PlayerA';
import * as playerB from '../wallet-engine/wallet-states/PlayerB';
import { WalletState } from '../redux/reducers/wallet-state';
import { PureComponent } from 'react';
import WalletLayout from './WalletLayout';
import FundingInProgress from './FundingInProgress';
import FundingError from './FundingError';
import React from 'react';
import ConfirmFunding from './ConfirmFunding';
import { FundingFailed, WaitForApproval } from '../wallet-engine/wallet-states';

interface Props {
  walletState: WalletState;
  tryFundingAgain: () => void;
  approveFunding: () => void;
  declineFunding: () => void;
}

export default class WalletController extends PureComponent<Props> {
  renderWallet() {
    const { walletState } = this.props;
    if (walletState === null) {
      return null;
    }

    switch (walletState && walletState.constructor) {
      case FundingFailed:
        return (
          <FundingError
            message={(walletState as FundingFailed).message}
            tryAgain={this.props.tryFundingAgain}
          />
        );
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
      case WaitForApproval:
      case playerB.WaitForApprovalWithAdjudicator:
        const { myAddress, opponentAddress, myBalance, opponentBalance } = walletState as WaitForApproval;
        const confirmFundingProps = {
          myAddress,
          opponentAddress,
          myBalance,
          opponentBalance,
          rulesAddress: '0x0123',
          appName: 'Rock Paper Scissors',
          approve: this.props.approveFunding,
          decline: this.props.declineFunding,
        };
        return <ConfirmFunding {...confirmFundingProps} />;
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
