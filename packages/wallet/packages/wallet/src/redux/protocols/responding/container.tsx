import * as states from './state';
import * as actions from './actions';
import { PureComponent } from 'react';
import { Commitment } from '../../../domain';
import React from 'react';
import Success from '../shared-components/success';
import Failure from '../shared-components/failure';
import { unreachable } from '../../../utils/reducer-utils';
import Acknowledge from '../shared-components/acknowledge';
import WaitForApproval from './components/wait-for-approval';
import { TransactionSubmission } from '../transaction-submission';
import { connect } from 'react-redux';

interface Props {
  state: states.RespondingState;
  respondApproved: (processId: string) => void;
  respondRejected: (processId: string) => void;
  respondSuccessAcknowledged: (processId: string) => void;
  responseProvided: (processId: string, commitment: Commitment) => void;
}
class RespondingContainer extends PureComponent<Props> {
  render() {
    const { state, respondSuccessAcknowledged, respondApproved, respondRejected } = this.props;
    switch (state.type) {
      case states.WAIT_FOR_ACKNOWLEDGEMENT:
        return (
          <Acknowledge
            title="Response Complete"
            description="You have successfully responded to the challenge."
            acknowledge={() => respondSuccessAcknowledged(state.processId)}
          />
        );
      case states.WAIT_FOR_APPROVAL:
        return (
          <WaitForApproval
            approve={() => respondApproved(state.processId)}
            deny={() => respondRejected(state.processId)}
          />
        );
      case states.WAIT_FOR_RESPONSE:
        // TODO: Should this ever been seen? We expect protocol above this to figure out getting the response
        return <div>Waiting for response</div>;
      case states.WAIT_FOR_TRANSACTION:
        return (
          <TransactionSubmission
            state={state.transactionSubmissionState}
            transactionName="Respond"
          />
        );
      case states.FAILURE:
        return <Failure name="respond" reason={state.reason} />;
      case states.SUCCESS:
        return <Success name="respond" />;
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {
  respondApproved: actions.respondApproved,
  respondRejected: actions.respondRejected,
  responseProvided: actions.responseProvided,
  respondSuccessAcknowledged: actions.respondSuccessAcknowledged,
};

export const Responding = connect(
  () => ({}),
  mapDispatchToProps,
)(RespondingContainer);
