import { getAdjudicatorContract } from '../../utils/contract-utils';
import { call, take, put, select } from 'redux-saga/effects';
import { eventChannel } from 'redux-saga';
import * as actions from '../actions';
import { ethers } from 'ethers';
import { fromParameters } from 'fmg-core/lib/commitment';
import { getAdjudicatorWatcherProcessesForChannel } from '../selectors';

enum AdjudicatorEventType {
  ChallengeCreated,
  Concluded,
  Refuted,
  RespondWithMove,
  Deposited,
}

interface AdjudicatorEvent {
  eventArgs: any;
  channelId: string;
  eventType: AdjudicatorEventType;
}

export function* adjudicatorWatcher(provider) {
  const adjudicatorEventChannel = yield call(createAdjudicatorEventChannel, provider);
  while (true) {
    const event: AdjudicatorEvent = yield take(adjudicatorEventChannel);

    const processIdsToAlert = yield select(
      getAdjudicatorWatcherProcessesForChannel,
      event.channelId,
    );

    yield dispatchEventAction(event);
    for (const processId of processIdsToAlert) {
      yield dispatchProcessEventAction(event, processId);
    }
  }
}

function* dispatchEventAction(event: AdjudicatorEvent) {
  switch (event.eventType) {
    case AdjudicatorEventType.ChallengeCreated:
      const { channelId } = event;
      const { commitment, finalizedAt } = event.eventArgs;
      yield put(actions.challengeCreatedEvent(channelId, fromParameters(commitment), finalizedAt));
      break;
  }
}

function* dispatchProcessEventAction(event: AdjudicatorEvent, processId: string) {
  const { channelId } = event;
  switch (event.eventType) {
    case AdjudicatorEventType.Concluded:
      yield put(actions.concludedEvent(processId, channelId));
      break;
    case AdjudicatorEventType.Refuted:
      yield put(
        actions.refutedEvent(processId, channelId, fromParameters(event.eventArgs.refutation)),
      );
      break;
    case AdjudicatorEventType.RespondWithMove:
      yield put(
        actions.respondWithMoveEvent(
          processId,
          channelId,
          fromParameters(event.eventArgs.response),
        ),
      );
      break;
    case AdjudicatorEventType.Deposited:
      yield put(
        actions.fundingReceivedEvent(
          processId,
          channelId,
          event.eventArgs.amountDeposited.toHexString(),
          event.eventArgs.destinationHoldings.toHexString(),
        ),
      );
      break;
  }
}

function* createAdjudicatorEventChannel(provider) {
  const adjudicator: ethers.Contract = yield call(getAdjudicatorContract, provider);

  return eventChannel(emitter => {
    const challengeCreatedFilter = adjudicator.filters.ChallengeCreated();
    const gameConcludedFilter = adjudicator.filters.Concluded();
    const refutedFilter = adjudicator.filters.Refuted();
    const respondWithMoveFilter = adjudicator.filters.RespondedWithMove();
    const depositedFilter = adjudicator.filters.Deposited();

    adjudicator.on(challengeCreatedFilter, (channelId, commitment, finalizedAt) => {
      emitter({
        eventType: AdjudicatorEventType.ChallengeCreated,
        channelId,
        eventArgs: { commitment, finalizedAt },
      });
    });
    adjudicator.on(gameConcludedFilter, channelId => {
      emitter({ eventType: AdjudicatorEventType.Concluded, channelId });
    });
    adjudicator.on(refutedFilter, (channelId, refutation) => {
      emitter({ eventType: AdjudicatorEventType.Refuted, eventArgs: { refutation }, channelId });
    });
    adjudicator.on(respondWithMoveFilter, (channelId, response) => {
      emitter({
        eventType: AdjudicatorEventType.RespondWithMove,
        eventArgs: { response },
        channelId,
      });
    });
    adjudicator.on(depositedFilter, (channelId, amountDeposited, destinationHoldings) => {
      emitter({
        eventType: AdjudicatorEventType.Deposited,
        eventArgs: { amountDeposited, destinationHoldings },
        channelId,
      });
    });
    return () => {
      // This function is called when the channel gets closed
      adjudicator.removeAllListeners(challengeCreatedFilter);
      adjudicator.removeAllListeners(gameConcludedFilter);
      adjudicator.removeAllListeners(refutedFilter);
      adjudicator.removeAllListeners(respondWithMoveFilter);
    };
  });
}
