import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import * as actions from '../../../redux/actions';
import { unreachable } from '../../../utils/reducer-utils';
import { FundingStep } from './components/funding-step';
import * as directFundingStates from './states';
import { TransactionSubmission } from '../../protocols/transaction-submission/container';
import { ActionDispatcher } from '../../utils';

interface Props {
  state: directFundingStates.DirectFundingState;
  transactionRetryApprovedAction: ActionDispatcher<actions.TransactionRetryApproved>;
}

class DirectFundingContainer extends PureComponent<Props> {
  render() {
    const { state: directFundingState } = this.props;
    switch (directFundingState.type) {
      case 'DirectFunding.NotSafeToDeposit':
      case 'DirectFunding.WaitForFunding':
      case 'DirectFunding.FundingSuccess':
        return <FundingStep directFundingState={directFundingState} />;
      case 'DirectFunding.WaitForDepositTransaction':
        return (
          // TODO: how should we populate the transaction name?
          <TransactionSubmission
            state={directFundingState.transactionSubmissionState}
            transactionName={'direct deposit'}
          />
        );
      case 'DirectFunding.FundingFailure':
        // todo: restrict the container to non-terminal states
        return <div>This shouldn't ever get shown.</div>;
      default:
        return unreachable(directFundingState);
    }
  }
}

const mapDispatchToProps = {
  transactionRetryApprovedAction: actions.transactionRetryApproved,
};

// why does it think that mapStateToProps can return undefined??

export const DirectFunding = connect(
  () => ({}),
  mapDispatchToProps,
)(DirectFundingContainer);
