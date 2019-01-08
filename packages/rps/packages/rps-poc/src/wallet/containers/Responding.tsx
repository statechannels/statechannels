import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';

import * as states from '../states';
import * as actions from '../redux/actions';

import AcknowledgeX from '../components/AcknowledgeX';
import WaitForXConfirmation from '../components/WaitForXConfirmation';
import SubmitX from '../components/SubmitX';
import { unreachable } from '../utils/reducer-utils';
import ChooseResponse, { ChallengeOptions } from '../components/responding/ChooseResponse';

interface Props {
  state: states.RespondingState;
  challengeAcknowledged: () => void;
  challengeResponseAcknowledged: () => void;
  selectRespondWithMove: () => void;
  selectRespondWithExistingMove: () => void;
}

class RespondingContainer extends PureComponent<Props> {
  render() {
    const {
      state,
      challengeAcknowledged,
      challengeResponseAcknowledged,
      selectRespondWithMove,
      selectRespondWithExistingMove,
    } = this.props;

    switch (state.type) {
      case states.ACKNOWLEDGE_CHALLENGE:
        return (
          <AcknowledgeX
            title="Challenge detected!"
            description="Your opponent has challenged you on-chain."
            action={challengeAcknowledged}
            actionTitle="Proceed"
          />
        );
      case states.CHOOSE_RESPONSE:
        const { ourIndex, turnNum } = state;
        const moveSelected = ourIndex === 0 ? turnNum % 2 === 0 : turnNum % 2 !== 0;
        let challengeOptions = [ChallengeOptions.RespondWithMove];
        if (moveSelected) {
          // TODO: We need to update the game to allow the user to choose a move even after they've selected an existing move.
          challengeOptions = [ChallengeOptions.RespondWithExistingMove];
        }
        return <ChooseResponse expiryTime={state.challengeExpiry ? state.challengeExpiry : 0}
          selectRespondWithMove={selectRespondWithMove}
          selectRespondWithExistingMove={selectRespondWithExistingMove}
          challengeOptions={challengeOptions} />;
      case states.TAKE_MOVE_IN_APP:
        // The game knows about the challenge so we don't need the wallet to display anything
        return null;
      case states.WAIT_FOR_RESPONSE_CONFIRMATION:
        return <WaitForXConfirmation name='response' />;
      case states.INITIATE_RESPONSE:
      case states.WAIT_FOR_RESPONSE_SUBMISSION:
        return <SubmitX name='response' />;
      case states.ACKNOWLEDGE_CHALLENGE_COMPLETE:
        return (
          <AcknowledgeX
            title="Challenge over!"
            description="Your response was successfully registered on-chain."
            action={challengeResponseAcknowledged}
            actionTitle="Return to app"
          />
        );
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {
  challengeAcknowledged: actions.challengeAcknowledged,
  challengeResponseAcknowledged: actions.challengeResponseAcknowledged,
  selectRespondWithMove: actions.respondWithMoveChosen,
  selectRespondWithExistingMove: actions.respondWithExistingMoveChosen,
};

export default connect(
  () => ({}),
  mapDispatchToProps,
)(RespondingContainer);
