import { ChallengeCreatedEvent } from '../actions';
import { take, select, put } from 'redux-saga/effects';
import * as selectors from '../selectors';
import { challengeDetected } from '../protocols/application/actions';
import { APPLICATION_PROCESS_ID } from '../protocols/application/reducer';

/**
 * A simple saga that determines if a challenge created event requires the wallet to initialize a respond protocol
 */
export function* challengeResponseInitiator() {
  while (true) {
    const action: ChallengeCreatedEvent = yield take('WALLET.ADJUDICATOR.CHALLENGE_CREATED_EVENT');
    const { commitment, channelId, finalizedAt: expiresAt } = action;

    const channelState = yield select(selectors.getOpenedChannelState, channelId);

    const numParticipants = commitment.channel.participants.length;
    const ourCommitment = commitment.turnNum % numParticipants !== channelState.ourIndex;

    if (ourCommitment) {
      yield put(
        challengeDetected({
          commitment,
          channelId,
          processId: APPLICATION_PROCESS_ID,
          expiresAt,
        }),
      );
    }
  }
}
