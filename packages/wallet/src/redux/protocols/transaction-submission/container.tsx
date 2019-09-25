import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';
import { NonTerminalTransactionSubmissionState } from './states';
import { unreachable } from '../../../utils/reducer-utils';

import { NETWORK_ID } from '../../../constants';
import * as actions from './actions';
import { ActionConstructor } from '../../utils';
import SubmitX from '../shared-components/submit-x';
import WaitForXConfirmation from '../shared-components/wait-for-x-confirmation';
import ApproveX from '../shared-components/approve-x';

interface Props {
  state: NonTerminalTransactionSubmissionState;
  transactionName: string;
  transactionRetryApproved: ActionConstructor<actions.TransactionRetryApproved>;
  transactionRetryDenied: ActionConstructor<actions.TransactionRetryDenied>;
}

class TransactionSubmissionContainer extends PureComponent<Props> {
  render() {
    const { state, transactionName, transactionRetryApproved, transactionRetryDenied } = this.props;
    switch (state.type) {
      case 'TransactionSubmission.WaitForSend':
      case 'TransactionSubmission.WaitForSubmission':
        return <SubmitX name={transactionName} />;
      case 'TransactionSubmission.WaitForConfirmation':
        return (
          <WaitForXConfirmation
            name={transactionName}
            transactionID={state.transactionHash}
            networkId={NETWORK_ID}
          />
        );
      case 'TransactionSubmission.ApproveRetry':
        const { processId } = state;
        return (
          <ApproveX
            title={'Transaction Failed'}
            description={
              'The ' +
              transactionName +
              ' transaction was not submitted to the network. Hit retry to try again.'
            }
            approvalAction={() => transactionRetryApproved({ processId })}
            yesMessage={'Retry'}
            rejectionAction={() => transactionRetryDenied({ processId })}
            noMessage={'Cancel'}
          />
        );
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {
  transactionRetryApproved: actions.transactionRetryApproved,
  transactionRetryDenied: actions.transactionRetryDenied,
};

export const TransactionSubmission = connect(
  () => ({}),
  mapDispatchToProps,
)(TransactionSubmissionContainer);
