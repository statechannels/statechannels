import {getAdjudicatorContract} from "../../utils/contract-utils";
import {call, take, put, select, fork, putResolve, delay} from "redux-saga/effects";
import {eventChannel} from "redux-saga";
import * as actions from "../actions";
import {getAdjudicatorWatcherSubscribersForChannel} from "../selectors";
import {ChannelSubscriber} from "../state";
import {ProtocolLocator} from "../../communication";
import {getChallengeRegisteredEvent, getChallengeClearedEvent} from "@statechannels/nitro-protocol";
import {bigNumberify} from "ethers/utils";
import {Contract, Event} from "ethers";
import {Web3Provider, TransactionResponse} from "ethers/providers";
import {messageSender} from "./messaging/message-sender";
import {channelUpdatedEvent} from "./messaging/outgoing-api-actions";

enum AdjudicatorEventType {
  ChallengeRegistered,
  ChallengeCleared,
  Concluded
}

interface AdjudicatorEvent {
  eventArgs: any;
  channelId: string;
  eventType: AdjudicatorEventType;
}

export function* adjudicatorWatcher(provider: Web3Provider) {
  const adjudicatorEventChannel = yield call(createAdjudicatorEventChannel, provider);
  while (true) {
    const event: AdjudicatorEvent = yield take(adjudicatorEventChannel);

    const channelSubscribers: ChannelSubscriber[] = yield select(
      getAdjudicatorWatcherSubscribersForChannel,
      event.channelId
    );

    yield dispatchEventAction(event);

    for (const subscriber of channelSubscribers) {
      yield dispatchProcessEventAction(event, subscriber.processId, subscriber.protocolLocator);
    }
  }
}

function* dispatchEventAction(event: AdjudicatorEvent) {
  const {channelId, eventType, eventArgs} = event;
  switch (eventType) {
    case AdjudicatorEventType.ChallengeRegistered:
      const {finalizesAt, challengeStates} = getChallengeRegisteredEvent(eventArgs);
      yield put(
        actions.challengeCreatedEvent({
          channelId,
          challengeStates,
          // Solidity timestamps are in seconds while JS are ms, so we convert to a JS timestamp
          finalizedAt: bigNumberify(finalizesAt)
            .mul(1000)
            .toNumber()
        })
      );
      break;
    case AdjudicatorEventType.ChallengeCleared:
      const newTurnNumRecord = event.eventArgs[1].toNumber();
      yield put(
        actions.challengeClearedEvent({
          channelId,
          newTurnNumRecord
        })
      );
      break;
    case AdjudicatorEventType.Concluded:
      yield put(actions.concludedEvent({channelId}));
      break;
    default:
      throw new Error(
        `Event is not a known adjudicator event. Cannot dispatch event action: ${JSON.stringify(
          event
        )}`
      );
  }
}

function* dispatchProcessEventAction(
  adjudicatorEvent: AdjudicatorEvent,
  processId: string,
  protocolLocator: ProtocolLocator
) {
  const {channelId} = adjudicatorEvent;
  switch (adjudicatorEvent.eventType) {
    case AdjudicatorEventType.ChallengeRegistered:
      const {finalizesAt} = getChallengeRegisteredEvent(adjudicatorEvent.eventArgs);
      yield put(
        actions.challengeExpirySetEvent({
          processId,
          protocolLocator,
          channelId,
          expiryTime: bigNumberify(finalizesAt)
            .mul(1000)
            .toNumber()
        })
      );
      break;
    case AdjudicatorEventType.ChallengeCleared:
      // NOTE: ethers does not have typings for this API call
      // See https://docs.ethers.io/ethers.js/html/api-contract.html#event-object for documentation
      const event: Event = adjudicatorEvent.eventArgs.slice(-1)[0];
      const tx: TransactionResponse = yield call([event, event.getTransaction]);
      // TODO: This could also be a checkpoint event, handle that too
      const responseEvent = getChallengeClearedEvent(tx, adjudicatorEvent.eventArgs);
      yield putResolve(
        actions.respondWithMoveEvent({
          processId,
          protocolLocator,
          channelId,
          signedResponseState: responseEvent.newStates[0]
        })
      );
      yield delay(1000); // TODO: Figure out why this is needed for rps to work in e2e test
      yield fork(messageSender, channelUpdatedEvent({channelId})); // @alex does it make sense to trigger a notification here?
      break;
    case AdjudicatorEventType.Concluded:
      break;
    default:
      throw new Error(
        `Event is not a known adjudicator event. Cannot dispatch process event action: ${JSON.stringify(
          adjudicatorEvent
        )}`
      );
  }
}

function* createAdjudicatorEventChannel(provider: Web3Provider) {
  const adjudicator: Contract = yield call(getAdjudicatorContract, provider);

  return eventChannel(emitter => {
    const challengeRegisteredFilter = adjudicator.filters.ChallengeRegistered();
    const challengeClearedFilter = adjudicator.filters.ChallengeCleared();
    const gameConcludedFilter = adjudicator.filters.Concluded();

    adjudicator.on(challengeRegisteredFilter, (...eventArgs) =>
      emitter({
        eventType: AdjudicatorEventType.ChallengeRegistered,
        channelId: eventArgs[0],
        eventArgs
      })
    );

    adjudicator.on(challengeClearedFilter, (...eventArgs) =>
      emitter({
        eventType: AdjudicatorEventType.ChallengeCleared,
        channelId: eventArgs[0],
        eventArgs
      })
    );

    adjudicator.on(gameConcludedFilter, channelId =>
      emitter({eventType: AdjudicatorEventType.Concluded, channelId})
    );

    return () =>
      // This function is called when the channel gets closed
      adjudicator
        .removeAllListeners(challengeRegisteredFilter)
        .removeAllListeners(challengeClearedFilter)
        .removeAllListeners(gameConcludedFilter);
  });
}
