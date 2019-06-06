import { ChallengeCreatedEvent } from '../actions';
import { take, select, put } from 'redux-saga/effects';
import * as selectors from '../selectors';
import { challengeCreated } from '../protocols/actions';

/**
 * A simple saga that determines if a challenge created event requires the wallet to create a respond process
 */
export function* challengeResponseInitiator() {
  while (true) {
    const action: ChallengeCreatedEvent = yield take('WALLET.ADJUDICATOR.CHALLENGE_CREATED_EVENT');
    const { commitment, channelId, finalizedAt } = action;

    const channelState = yield select(selectors.getOpenedChannelState, channelId);

    const numParticipants = commitment.channel.participants.length;
    const ourCommitment = commitment.turnNum % numParticipants !== channelState.ourIndex;

    if (ourCommitment) {
      yield put(challengeCreated({ commitment, expiresAt: finalizedAt, channelId }));
    }
  }
}
