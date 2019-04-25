import React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';
import { Button } from 'reactstrap';

import * as states from '../redux/channel-store/state';
import * as actions from '../redux/actions';

import { RespondingStep } from '../components/responding/responding-step';
import AcknowledgeTimeout from '../components/responding/acknowledge-timeout';
import { unreachable } from '../utils/reducer-utils';
import ChooseResponse, { ChallengeOptions } from '../components/responding/choose-response';
import TransactionFailed from '../components/transaction-failed';
import { WalletProtocol } from '../redux/types';

interface Props {
  state: states.RespondingState;
  challengeAcknowledged: () => void;
  challengeResponseAcknowledged: () => void;
  selectRespondWithMove: () => void;
  selectRespondWithExistingMove: () => void;
  transactionRetryApproved: (channelId: string, protocol: WalletProtocol) => void;
  timeoutAcknowledged: () => void;
}

class RespondingContainer extends PureComponent<Props> {
  render() {
    const {
      state,
      challengeResponseAcknowledged,
      selectRespondWithMove,
      selectRespondWithExistingMove,
      timeoutAcknowledged,
      transactionRetryApproved,
    } = this.props;

    switch (state.type) {
      case states.CHALLENGEE_ACKNOWLEDGE_CHALLENGE_TIMEOUT:
        return (
          <AcknowledgeTimeout
            expiryTime={state.challengeExpiry ? state.challengeExpiry : 0}
            timeoutAcknowledged={timeoutAcknowledged}
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
        return (
          <ChooseResponse
            expiryTime={state.challengeExpiry ? state.challengeExpiry : 0}
            selectRespondWithMove={selectRespondWithMove}
            selectRespondWithExistingMove={selectRespondWithExistingMove}
            challengeOptions={challengeOptions}
          />
        );
      case states.TAKE_MOVE_IN_APP:
        // The game knows about the challenge so we don't need the wallet to display anything
        return null;
      case states.INITIATE_RESPONSE:
        return <RespondingStep step={0} />;
      case states.WAIT_FOR_RESPONSE_SUBMISSION:
        return <RespondingStep step={1} />;
      case states.WAIT_FOR_RESPONSE_CONFIRMATION:
        return <RespondingStep step={2} />;
      case states.ACKNOWLEDGE_CHALLENGE_COMPLETE:
        return (
          <RespondingStep step={4}>
            <Button onClick={challengeResponseAcknowledged}>{'Return to game'}</Button>
          </RespondingStep>
        );
      case states.RESPONSE_TRANSACTION_FAILED:
        return (
          <TransactionFailed
            name="challenge response"
            retryAction={() => transactionRetryApproved(state.channelId, WalletProtocol.Responding)}
          />
        );
      default:
        return unreachable(state);
    }
  }
}

const mapDispatchToProps = {
  challengeAcknowledged: actions.channel.challengeAcknowledged,
  challengeResponseAcknowledged: actions.channel.challengeResponseAcknowledged,
  selectRespondWithMove: actions.channel.respondWithMoveChosen,
  selectRespondWithExistingMove: actions.channel.respondWithExistingMoveChosen,
  transactionRetryApproved: actions.transactionRetryApproved,
  timeoutAcknowledged: actions.channel.challengedTimedOutAcknowledged,
};

export default connect(
  () => ({}),
  mapDispatchToProps,
)(RespondingContainer);
