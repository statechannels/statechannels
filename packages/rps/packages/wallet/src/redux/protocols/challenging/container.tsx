import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';
import { NonTerminalState as NonTerminalChallengingState, FailureReason } from './states';
import { unreachable } from '../../../utils/reducer-utils';
import * as actions from './actions';
import ApproveChallenge from './components/approve-challenge';
import { TransactionSubmission } from '../transaction-submission';
import Acknowledge from '../shared-components/acknowledge';
import WaitForResponseOrTimeout from './components/wait-for-response-or-timeout';

interface Props {
  state: NonTerminalChallengingState;
  approve: (processId: string) => void;
  deny: (processId: string) => void;
  failureAcknowledged: (processId: string) => void;
  responseAcknowledged: (processId: string) => void;
  timeoutAcknowledged: (processId: string) => void;
}

class ChallengingContainer extends PureComponent<Props> {
  render() {
    const {
      state,
      deny,
      approve,
      failureAcknowledged,
      responseAcknowledged,
      timeoutAcknowledged,
    } = this.props;
    const processId = state.processId;
    switch (state.type) {
      case 'ApproveChallenge':
        return <ApproveChallenge deny={() => deny(processId)} approve={() => approve(processId)} />;
      case 'WaitForTransaction':
        return (
          <TransactionSubmission transactionName="challenge" state={state.transactionSubmission} />
        );
      case 'WaitForResponseOrTimeout':
        // todo: get expiration time
        return <WaitForResponseOrTimeout expirationTime={20} />;
      case 'AcknowledgeResponse':
        return (
          <Acknowledge
            title="Opponent responded!"
            description="Your opponent responded to your challenge. You can now continue with your application."
            acknowledge={() => responseAcknowledged(processId)}
          />
        );
      case 'AcknowledgeTimeout':
        return (
          <Acknowledge
            title="Challenge timed out!"
            description="The challenge timed out. You can now reclaim your funds."
            acknowledge={() => timeoutAcknowledged(processId)}
          />
        );
      case 'AcknowledgeFailure':
        const description = describeFailure(state.reason);

        return (
          <Acknowledge
            title="Challenge not possible"
            description={description}
            acknowledge={() => failureAcknowledged(processId)}
          />
        );
      default:
        return unreachable(state);
    }
  }
}

function describeFailure(reason: FailureReason): string {
  switch (reason) {
    case 'AlreadyHaveLatest':
      return 'Your opponent has already sent you their latest state.';
    case 'ChannelDoesntExist':
      return "The channel doesn't exist.";
    case 'DeclinedByUser':
      return 'The challenge failed because you cancelled it.';
    case 'LatestWhileApproving':
      return "Your opponent's move arrived while you were approving the challenge, so there's no need to challenge anymore";
    case 'NotFullyOpen':
      return "The channel that you're launching the challenge on isn't fully open.";
    case 'TransactionFailed':
      return 'The blockchain transaction failed.';
    default:
      return unreachable(reason);
  }
}

const mapDispatchToProps = {
  approve: actions.challengeApproved,
  deny: actions.challengeDenied,
  failureAcknowledged: actions.challengeFailureAcknowledged,
  responseAcknowledged: actions.challengeResponseAcknowledged,
  timeoutAcknowledged: actions.challengeTimeoutAcknowledged,
};

export const Challenging = connect(
  () => ({}),
  mapDispatchToProps,
)(ChallengingContainer);
