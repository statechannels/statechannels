import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';

import * as states from '../states';
import * as actions from '../redux/actions';

import AcknowledgeX from '../components/AcknowledgeX';
import WaitForResponseOrTimeout from '../components/challenging/WaitForResponseOrTimeout';
import ApproveX from '../components/ApproveX';
import WaitForXConfirmation from '../components/WaitForXConfirmation';
import WaitForXInitiation from '../components/WaitForXInitiation';
import SubmitX from '../components/SubmitX';
import { unreachable } from '../utils/reducer-utils';

interface Props {
  state: states.ChallengingState;
  timeoutAcknowledged: () => void;
  challengeResponseAcknowledged: () => void;
  challengeApproved: () => void;
  challengeRejected: () => void;
}

class ChallengingContainer extends PureComponent<Props> {
  render() {
    const {
      state,
      timeoutAcknowledged,
      challengeResponseAcknowledged,
      challengeApproved,
      challengeRejected,
    } = this.props;

    switch (state.type) {
      case states.APPROVE_CHALLENGE:
        return (
          <ApproveX
            title="Launch a challenge!"
            description="You've selected to launch an on-chain challenge. Do you want to proceed?"
            approvalAction={challengeApproved}
            rejectionAction={challengeRejected}
          />
        );
      case states.WAIT_FOR_CHALLENGE_INITIATION:
        return <WaitForXInitiation name="challenge" />;
      case states.WAIT_FOR_CHALLENGE_SUBMISSION:
        return <SubmitX name="challenge" />;
      case states.WAIT_FOR_CHALLENGE_CONFIRMATION:
        return <WaitForXConfirmation name="challenge" />;
      case states.WAIT_FOR_RESPONSE_OR_TIMEOUT:
        return <WaitForResponseOrTimeout expirationTime={state.challengeExpiry ? state.challengeExpiry : 0} />;
      case states.ACKNOWLEDGE_CHALLENGE_RESPONSE:
        return (
          <AcknowledgeX
            title="Challenge over!"
            action={challengeResponseAcknowledged}
            description="Your opponent responded to the challenge."
            actionTitle="Return to game"
          />
        );
      case states.ACKNOWLEDGE_CHALLENGE_TIMEOUT:

        const parsedExpiryDate = new Date(state.challengeExpiry ? state.challengeExpiry * 1000 : 0).toLocaleTimeString();
        const description = `The challenge expired at ${parsedExpiryDate}. You may now withdraw your funds.`;
        return (
          <AcknowledgeX
            title="A challenge has expired"
            description={description}
            action={timeoutAcknowledged}
            actionTitle="Withdraw your funds"
          />
        );
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {
  timeoutAcknowledged: actions.challengedTimedOutAcknowledged,
  challengeResponseAcknowledged: actions.challengeResponseAcknowledged,
  challengeApproved: actions.challengeApproved,
  challengeRejected: actions.challengeRejected,
};

export default connect(
  () => ({}),
  mapDispatchToProps,
)(ChallengingContainer);

