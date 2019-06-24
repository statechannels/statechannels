import * as states from './states';
import * as actions from './actions';
import { PureComponent } from 'react';
import React from 'react';
import { unreachable } from '../../../../utils/reducer-utils';
import Acknowledge from '../../shared-components/acknowledge';
import WaitForApproval from './components/wait-for-approval';
import { TransactionSubmission } from '../../transaction-submission/container';

import { connect } from 'react-redux';
import { ActionDispatcher } from '../../../utils';
import DefundOrNot from '../challenger/components/defund-or-not';
import { DefundRequested, defundRequested } from '../../actions';

interface Props {
  state: states.NonTerminalResponderState;
  respondApproved: ActionDispatcher<actions.RespondApproved>;
  responseProvided: ActionDispatcher<actions.ResponseProvided>;
  acknowledged: ActionDispatcher<actions.Acknowledged>;
  defund: ActionDispatcher<DefundRequested>;
}
class ResponderContainer extends PureComponent<Props> {
  render() {
    const { state, respondApproved, acknowledged, defund } = this.props;
    const { processId } = state;
    switch (state.type) {
      case 'Responding.WaitForAcknowledgement':
        return (
          <Acknowledge
            title="Response Complete"
            description="You have successfully responded to the challenge."
            acknowledge={() => acknowledged({ processId })}
          />
        );
      case 'Responding.WaitForApproval':
        return (
          <WaitForApproval
            expirationTime={state.expiryTime}
            approve={() => respondApproved({ processId })}
          />
        );
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
      case 'Responding.AcknowledgeTimeout':
        return (
          <DefundOrNot
            approve={() => defund({ channelId: state.channelId, processId })}
            deny={() => acknowledged({ processId })}
            channelId={state.channelId}
          />
        );
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {
  respondApproved: actions.respondApproved,
  responseProvided: actions.responseProvided,
  acknowledged: actions.acknowledged,
  defund: defundRequested, // TODO in future we should split this action into two distinct actions, so that protocol action and new process action unions remain disjoint.
};

export const Responder = connect(
  () => ({}),
  mapDispatchToProps,
)(ResponderContainer);
