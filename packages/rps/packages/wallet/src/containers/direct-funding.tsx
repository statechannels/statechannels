import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';

import * as fundingStates from '../redux/funding-state/state';
import * as actions from '../redux/actions';

import { unreachable } from '../utils/reducer-utils';
import { FundingStep, fundingStepByState } from '../components/funding/funding-step';
import EtherscanLink from '../components/etherscan-link';
import TransactionFailed from '../components/transaction-failed';
import { WalletProcedure } from '../redux/types';

interface Props {
  state: fundingStates.DirectFundingState;
  channelId: string;
  fundingSuccessAcknowledged: () => void;
  fundingDeclinedAcknowledged: () => void;
  retryTransactionAction: (channelId: string, procedure: WalletProcedure) => void;
}

class DirectFundingContainer extends PureComponent<Props> {
  render() {
    const { state, retryTransactionAction, channelId } = this.props;
    const status = state[channelId];
    const step = fundingStepByState(status);
    if (
      fundingStates.stateIsNotSafeToDeposit(status) ||
      fundingStates.stateIsWaitForFundingConfirmation(status)
    ) {
      return <FundingStep step={step} />;
    }
    if (fundingStates.stateIsDepositing(status)) {
      switch (status.depositStatus) {
        case fundingStates.depositing.WAIT_FOR_TRANSACTION_SENT:
          return <FundingStep step={step} />;
        case fundingStates.depositing.WAIT_FOR_DEPOSIT_APPROVAL:
          return <FundingStep step={step}>Please confirm the transaction in MetaMask!</FundingStep>;
        case fundingStates.depositing.WAIT_FOR_DEPOSIT_CONFIRMATION:
          return (
            <FundingStep step={step}>
              Check the progress on&nbsp;
              <EtherscanLink
                transactionID={status.transactionHash}
                networkId={-1} // TODO: Fix network id
                title="Etherscan"
              />
              !
            </FundingStep>
          );
        case fundingStates.depositing.DEPOSIT_TRANSACTION_FAILED:
          return (
            <TransactionFailed
              name="deposit"
              retryAction={() =>
                retryTransactionAction(status.channelId, WalletProcedure.DirectFunding)
              }
            />
          );

        default:
          return unreachable(status);
      }
    }
    if (fundingStates.stateIsChannelFunded(status)) {
      return null;
    }

    return unreachable(status);
  }
}

const mapDispatchToProps = {
  fundingApproved: actions.channel.fundingApproved,
  fundingRejected: actions.channel.fundingRejected,
  fundingSuccessAcknowledged: actions.channel.fundingSuccessAcknowledged,
  fundingDeclinedAcknowledged: actions.channel.fundingDeclinedAcknowledged,
  retryTransactionAction: actions.retryTransaction,
};

// why does it think that mapStateToProps can return undefined??

export default connect(
  (state: any) => ({ state: state.fundingState.directFunding }),
  mapDispatchToProps,
)(DirectFundingContainer);
