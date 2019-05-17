import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';
import { NonTerminalChallengerState, FailureReason } from './states';
import { unreachable } from '../../../../utils/reducer-utils';
import * as actions from './actions';
import ApproveChallenge from './components/approve-challenge';
import { TransactionSubmission } from '../../transaction-submission';
import Acknowledge from '../../shared-components/acknowledge';
import WaitForResponseOrTimeout from './components/wait-for-response-or-timeout';
import { Defunding } from '../../defunding/container';

interface Props {
  state: NonTerminalChallengerState;
  approve: (processId: string) => void;
  deny: (processId: string) => void;
  failureAcknowledged: (processId: string) => void;
  responseAcknowledged: (processId: string) => void;
  acknowledged: (processId: string) => void;
  defundChosen: (processId: string) => void;
}

class ChallengerContainer extends PureComponent<Props> {
  render() {
    const {
      state,
      deny,
      approve,
      failureAcknowledged,
      responseAcknowledged,
      acknowledged,
      defundChosen,
    } = this.props;
    const processId = state.processId;
    switch (state.type) {
      case 'Challenging.ApproveChallenge':
        return <ApproveChallenge deny={() => deny(processId)} approve={() => approve(processId)} />;
      case 'Challenging.WaitForTransaction':
        return (
          <TransactionSubmission transactionName="challenge" state={state.transactionSubmission} />
        );
      case 'Challenging.WaitForResponseOrTimeout':
        // todo: get expiration time
        return <WaitForResponseOrTimeout expirationTime={state.expiryTime} />;
      case 'Challenging.AcknowledgeResponse':
        return (
          <Acknowledge
            title="Opponent responded!"
            description="Your opponent responded to your challenge. You can now continue with your application."
            acknowledge={() => responseAcknowledged(processId)}
          />
        );
      case 'Challenging.AcknowledgeTimeout':
        return (
          <Acknowledge
            title="Challenge timed out!"
            description="The challenge timed out. You can now reclaim your funds."
            acknowledge={() => defundChosen(processId)}
          />
        );
      case 'Challenging.AcknowledgeFailure':
        const description = describeFailure(state.reason);

        return (
          <Acknowledge
            title="Challenge not possible"
            description={description}
            acknowledge={() => failureAcknowledged(processId)}
          />
        );
      case 'Challenging.WaitForDefund':
        return <Defunding state={state.defundingState} />;
      case 'Challenging.AcknowledgeClosedButNotDefunded':
        return (
          <Acknowledge
            title="Defunding failed!"
            description="The channel was closed but not defunded."
            acknowledge={() => acknowledged(processId)}
          />
        );
      case 'Challenging.AcknowledgeSuccess':
        return (
          <Acknowledge
            title="Success!"
            description="The channel was closed and defunded."
            acknowledge={() => acknowledged(processId)}
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
  acknowledged: actions.acknowledged,
  defundChosen: actions.defundChosen,
};

export const Challenger = connect(
  () => ({}),
  mapDispatchToProps,
)(ChallengerContainer);
