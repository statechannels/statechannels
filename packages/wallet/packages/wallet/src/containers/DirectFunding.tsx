import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';

import * as fundingStates from '../redux/fundingState/state';
import * as actions from '../redux/actions';

import { unreachable } from '../utils/reducer-utils';
import { FundingStep, fundingStepByState } from '../components/funding/FundingStep';
import EtherscanLink from '../components/EtherscanLink';
import TransactionFailed from '../components/TransactionFailed';

interface Props {
  state: fundingStates.DirectFundingState;
  channelId: string;
  fundingSuccessAcknowledged: () => void;
  fundingDeclinedAcknowledged: () => void;
  retryTransactionAction: () => void;
}

class DirectFundingContainer extends PureComponent<Props> {
  render() {
    const { state, retryTransactionAction } = this.props;
    const step = fundingStepByState(state);
    if (
      fundingStates.stateIsNotSafeToDeposit(state) ||
      fundingStates.stateIsWaitForFundingConfirmation(state)
    ) {
      return <FundingStep step={step} />;
    }
    if (fundingStates.stateIsDepositing(state)) {
      switch (state.depositStatus) {
        case fundingStates.depositing.WAIT_FOR_TRANSACTION_SENT:
          return <FundingStep step={step} />;
        case fundingStates.depositing.WAIT_FOR_DEPOSIT_APPROVAL:
          return <FundingStep step={step}>Please confirm the transaction in MetaMask!</FundingStep>;
        case fundingStates.depositing.WAIT_FOR_DEPOSIT_CONFIRMATION:
          return (
            <FundingStep step={step}>
              Check the progress on&nbsp;
              <EtherscanLink
                transactionID={state.transactionHash}
                networkId={-1} // TODO: Fix network id
                title="Etherscan"
              />
              !
            </FundingStep>
          );
        case fundingStates.depositing.DEPOSIT_TRANSACTION_FAILED:
          return <TransactionFailed name="deposit" retryAction={retryTransactionAction} />;

        default:
          return unreachable(state);
      }
    }
    if (fundingStates.stateIsChannelFunded(state)) {
      return null;
    }

    return unreachable(state);
  }
}

const mapDispatchToProps = {
  fundingApproved: actions.fundingApproved,
  fundingRejected: actions.fundingRejected,
  fundingSuccessAcknowledged: actions.fundingSuccessAcknowledged,
  fundingDeclinedAcknowledged: actions.fundingDeclinedAcknowledged,
  retryTransactionAction: actions.retryTransaction,
};

// why does it think that mapStateToProps can return undefined??

export default connect(
  (state: any) => ({ state: state.fundingState }),
  mapDispatchToProps,
)(DirectFundingContainer);
