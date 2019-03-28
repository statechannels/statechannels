import { getAdjudicatorContract } from '../../utils/contract-utils';
import { call, take, put } from 'redux-saga/effects';
import { eventChannel } from 'redux-saga';
import * as actions from '../actions';
import { ethers } from 'ethers';
import { unreachable } from '../../utils/reducer-utils';
import { fromParameters } from 'fmg-core/lib/commitment';

enum AdjudicatorEventType {
  ChallengeCreated,
  Concluded,
  Refuted,
  RespondWithMove,
  Deposited,
}

interface AdjudicatorEvent {
  eventArgs: any;
  eventType: AdjudicatorEventType;
}
function* createEventChannel(provider, channelId: string) {
  const adjudicator: ethers.Contract = yield call(getAdjudicatorContract, provider);

  return eventChannel(emitter => {
    const challengeCreatedFilter = adjudicator.filters.ChallengeCreated();
    const gameConcludedFilter = adjudicator.filters.Concluded();
    const refutedFilter = adjudicator.filters.Refuted();
    const respondWithMoveFilter = adjudicator.filters.RespondedWithMove();
    const depositedFilter = adjudicator.filters.Deposited();

    adjudicator.on(challengeCreatedFilter, (cId, commitment, finalizedAt) => {
      if (channelId === cId) {
        emitter({
          eventType: AdjudicatorEventType.ChallengeCreated,
          eventArgs: { channelId, commitment, finalizedAt },
        });
      }
    });
    adjudicator.on(gameConcludedFilter, cId => {
      if (channelId === cId) {
        emitter({ eventType: AdjudicatorEventType.Concluded, eventArgs: { channelId } });
      }
    });
    adjudicator.on(refutedFilter, (cId, refutation) => {
      if (channelId === cId) {
        emitter({ eventType: AdjudicatorEventType.Refuted, eventArgs: { channelId, refutation } });
      }
    });
    adjudicator.on(respondWithMoveFilter, (cId, response) => {
      if (channelId === cId) {
        emitter({
          eventType: AdjudicatorEventType.RespondWithMove,
          eventArgs: { channelId, response },
        });
      }
    });
    adjudicator.on(depositedFilter, (destination, amountDeposited, destinationHoldings) => {
      if (destination === channelId) {
        emitter({
          eventType: AdjudicatorEventType.Deposited,
          eventArgs: { destination, amountDeposited, destinationHoldings },
        });
      }
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
export function* adjudicatorWatcher(channelId, provider) {
  const channel = yield call(createEventChannel, provider, channelId);
  while (true) {
    const event: AdjudicatorEvent = yield take(channel);
    switch (event.eventType) {
      case AdjudicatorEventType.ChallengeCreated:
        const { channelId: eventChannelId, commitment, finalizedAt } = event.eventArgs;
        yield put(
          actions.channel.challengeCreatedEvent(
            eventChannelId,
            fromParameters(commitment),
            finalizedAt,
          ),
        );
        break;
      case AdjudicatorEventType.Concluded:
        yield put(actions.channel.concludedEvent(event.eventArgs.channelId));
        break;
      case AdjudicatorEventType.Refuted:
        yield put(
          actions.channel.refutedEvent(
            event.eventArgs.channelId,
            fromParameters(event.eventArgs.refutation),
          ),
        );
        break;
      case AdjudicatorEventType.RespondWithMove:
        yield put(
          actions.channel.respondWithMoveEvent(
            event.eventArgs.channelId,
            fromParameters(event.eventArgs.response),
          ),
        );
        break;
      case AdjudicatorEventType.Deposited:
        yield put(
          actions.funding.fundingReceivedEvent(
            event.eventArgs.destination,
            event.eventArgs.amountDeposited.toHexString(),
            event.eventArgs.destinationHoldings.toHexString(),
          ),
        );
        break;
      default:
        unreachable(event.eventType);
    }
  }
}
