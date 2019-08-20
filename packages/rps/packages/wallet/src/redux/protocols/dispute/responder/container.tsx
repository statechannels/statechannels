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
import { closeLedgerChannel } from '../../actions';
import { multipleWalletActions } from '../../../../redux/actions';
import ApproveX from '../../shared-components/approve-x';

interface Props {
  state: states.NonTerminalResponderState;
  respondApproved: ActionDispatcher<actions.RespondApproved>;
  responseProvided: ActionDispatcher<actions.ResponseProvided>;
  acknowledged: ActionDispatcher<actions.Acknowledged>;
  defund: typeof closeLedgerChannelAndExitChallenge;
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
          <ApproveX
            title={'Challenge timed out!'}
            children={
              <div>
                The challenge timed out. Channel
                <div className="channel-address">{state.channelId}</div>
                is now finalized -- would you like to defund it?
              </div>
            }
            description={''}
            yesMessage={'Defund'}
            approvalAction={() => defund(processId, state.channelId)}
            noMessage={'No'}
            rejectionAction={() => acknowledged({ processId })}
          />
        );
      default:
        return unreachable(state);
    }
  }
}

function closeLedgerChannelAndExitChallenge(processId, channelId) {
  return multipleWalletActions({
    actions: [closeLedgerChannel({ channelId }), actions.exitChallenge({ processId })],
  });
}

const mapDispatchToProps = {
  respondApproved: actions.respondApproved,
  responseProvided: actions.responseProvided,
  acknowledged: actions.acknowledged,
  defund: closeLedgerChannelAndExitChallenge,
};

export const Responder = connect(
  () => ({}),
  mapDispatchToProps,
)(ResponderContainer);
