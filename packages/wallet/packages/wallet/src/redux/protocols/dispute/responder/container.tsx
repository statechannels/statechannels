import * as states from './states';
import * as actions from './actions';
import { PureComponent } from 'react';
import React from 'react';
import { unreachable } from '../../../../utils/reducer-utils';
import Acknowledge from '../../shared-components/acknowledge';
import WaitForApproval from './components/wait-for-approval';
import { TransactionSubmission } from '../../transaction-submission/container';
import { Defunding } from '../../defunding/container';

import { connect } from 'react-redux';
import { ActionDispatcher } from '../../../utils';

interface Props {
  state: states.NonTerminalResponderState;
  respondApproved: ActionDispatcher<actions.RespondApproved>;
  respondSuccessAcknowledged: ActionDispatcher<actions.RespondSuccessAcknowledged>;
  responseProvided: ActionDispatcher<actions.ResponseProvided>;
  acknowledged: ActionDispatcher<actions.Acknowledged>;
  defundChosen: ActionDispatcher<actions.DefundChosen>;
}
class ResponderContainer extends PureComponent<Props> {
  render() {
    const {
      state,
      respondSuccessAcknowledged,
      respondApproved,
      acknowledged,
      defundChosen,
    } = this.props;
    const { processId } = state;
    switch (state.type) {
      case 'Responding.WaitForAcknowledgement':
        return (
          <Acknowledge
            title="Response Complete"
            description="You have successfully responded to the challenge."
            acknowledge={() => respondSuccessAcknowledged({ processId })}
          />
        );
      case 'Responding.WaitForApproval':
        return <WaitForApproval approve={() => respondApproved({ processId })} />;
      case 'Responding.WaitForResponse':
        // TODO: Should this ever been seen? We expect protocol above this to figure out getting the response
        return <div>Waiting for response</div>;
      case 'Responding.WaitForTransaction':
        return (
          <TransactionSubmission
            state={state.transactionSubmissionState}
            transactionName="Respond"
          />
        );
      case 'Responding.AcknowledgeClosedButNotDefunded':
        return (
          <Acknowledge
            title="Defunding failed!"
            description="The channel was closed but not defunded."
            acknowledge={() => acknowledged({ processId })}
          />
        );
      case 'Responding.AcknowledgeDefundingSuccess':
        return (
          <Acknowledge
            title="Defunding success!"
            description="The channel was closed and defunded."
            acknowledge={() => acknowledged({ processId })}
          />
        );
      case 'Responding.AcknowledgeTimeout':
        return (
          <Acknowledge
            title="Challenge timeout!"
            description="You failed to respond to a challenge in time. Defund the channel now?"
            acknowledge={() => defundChosen({ processId })}
          />
        );
      case 'Responding.WaitForDefund':
        return <Defunding state={state.defundingState} />;
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {
  respondApproved: actions.respondApproved,
  responseProvided: actions.responseProvided,
  respondSuccessAcknowledged: actions.respondSuccessAcknowledged,
  acknowledged: actions.acknowledged,
  defundChosen: actions.defundChosen,
};

export const Responder = connect(
  () => ({}),
  mapDispatchToProps,
)(ResponderContainer);
