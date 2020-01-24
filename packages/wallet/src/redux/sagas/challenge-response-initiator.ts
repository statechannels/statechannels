import {ChallengeCreatedEvent} from "../actions";
import {take, select, put, fork} from "redux-saga/effects";
import * as selectors from "../selectors";
import {challengeDetected} from "../protocols/application/actions";
import {APPLICATION_PROCESS_ID} from "../protocols/application/reducer";
import {channelUpdatedEvent} from "./messaging/outgoing-api-actions";
import {messageSender} from "./messaging/message-sender";

/**
 * A simple saga that determines if a challenge created event requires the wallet to initialize a respond protocol
 */
export function* challengeResponseInitiator() {
  while (true) {
    const action: ChallengeCreatedEvent = yield take("WALLET.ADJUDICATOR.CHALLENGE_CREATED_EVENT");
    const {challengeStates, channelId, finalizedAt: expiresAt} = action;

    const channelState = yield select(selectors.getOpenedChannelState, channelId);
    const [{state: latestState}] = challengeStates.slice(-1);
    const numParticipants = latestState.channel.participants.length;
    const ourStateIsLast = latestState.turnNum % numParticipants !== channelState.ourIndex;

    if (ourStateIsLast) {
      yield put(
        challengeDetected({
          state: latestState,
          channelId,
          processId: APPLICATION_PROCESS_ID,
          expiresAt
        })
      );

      yield fork(messageSender, channelUpdatedEvent({channelId}));
    }
  }
}
