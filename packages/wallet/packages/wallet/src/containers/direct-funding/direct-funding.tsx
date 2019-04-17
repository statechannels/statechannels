import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';

import * as directFundingStates from '../../redux/protocols/direct-funding/state';
import * as actions from '../../redux/actions';

import { unreachable } from '../../utils/reducer-utils';
import { FundingStep, fundingStepByState } from '../../components/funding/funding-step';
import EtherscanLink from '../../components/etherscan-link';
import TransactionFailed from '../../components/transaction-failed';
import { WalletProtocol } from '../../redux/types';

interface Props {
  directFundingState: directFundingStates.DirectFundingState;
  fundingSuccessAcknowledged: () => void;
  fundingDeclinedAcknowledged: () => void;
  transactionRetryApprovedAction: (channelId: string, protocol: WalletProtocol) => void;
}

class DirectFundingContainer extends PureComponent<Props> {
  render() {
    const { directFundingState, transactionRetryApprovedAction } = this.props;
    const step = fundingStepByState(directFundingState);
    if (
      directFundingStates.stateIsNotSafeToDeposit(directFundingState) ||
      directFundingStates.stateIsWaitForFundingConfirmation(directFundingState)
    ) {
      return <FundingStep step={step} />;
    }
    if (directFundingStates.stateIsDepositing(directFundingState)) {
      switch (directFundingState.depositStatus) {
        case directFundingStates.depositing.WAIT_FOR_TRANSACTION_SENT:
          return <FundingStep step={step} />;
        case directFundingStates.depositing.WAIT_FOR_DEPOSIT_APPROVAL:
          return <FundingStep step={step}>Please confirm the transaction in MetaMask!</FundingStep>;
        case directFundingStates.depositing.WAIT_FOR_DEPOSIT_CONFIRMATION:
          return (
            <FundingStep step={step}>
              Check the progress on&nbsp;
              <EtherscanLink
                transactionID={directFundingState.transactionHash}
                networkId={-1} // TODO: Fix network id
                title="Etherscan"
              />
              !
            </FundingStep>
          );
        case directFundingStates.depositing.DEPOSIT_TRANSACTION_FAILED:
          return (
            <TransactionFailed
              name="deposit"
              retryAction={() =>
                transactionRetryApprovedAction(
                  directFundingState.channelId,
                  WalletProtocol.DirectFunding,
                )
              }
            />
          );

        default:
          return unreachable(directFundingState);
      }
    }
    if (directFundingStates.stateIsChannelFunded(directFundingState)) {
      return null;
    }

    return unreachable(directFundingState);
  }
}

const mapDispatchToProps = {
  fundingApproved: actions.channel.fundingApproved,
  fundingRejected: actions.channel.fundingRejected,
  fundingSuccessAcknowledged: actions.channel.fundingSuccessAcknowledged,
  fundingDeclinedAcknowledged: actions.channel.fundingDeclinedAcknowledged,
  transactionRetryApprovedAction: actions.transactionRetryApproved,
};

// why does it think that mapStateToProps can return undefined??

export default connect(
  () => ({}),
  mapDispatchToProps,
)(DirectFundingContainer);
