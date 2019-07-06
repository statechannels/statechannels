import { challengeWatcher } from '../challenge-watcher';
import { channel } from 'redux-saga';
import { AdjudicatorState } from '../../adjudicator-state/state';
import * as actions from '../../actions';
import { put } from 'redux-saga/effects';
import { channelId, appCommitment } from '../../../domain/commitments/__tests__';

describe('challenge-watcher', () => {
  it('dispatches a challenge expired action for an expired challenge on a channel', () => {
    const mockEventChannel = channel();
    const saga = challengeWatcher();
    // getProvider call
    saga.next();
    // getProvider
    saga.next({
      getBlock: blockNum => {
        /* Dummy Function */
      },
    });
    // construct blockMinedChannel
    saga.next(mockEventChannel);
    // Take from event channel
    saga.next(5);
    // Get Block
    saga.next({ timestamp: 2 });
    const adjudicatorState: AdjudicatorState = {
      [channelId]: {
        finalized: false,
        channelId,
        balance: '0x0',
        challenge: { expiresAt: 1, challengeCommitment: appCommitment({ turnNum: 20 }).commitment },
      },
    };
    // Select adjudicator state
    saga.next(adjudicatorState);
    const processId = 'abc';
    const result = saga.next([processId]).value;

    expect(result).toEqual(
      put(actions.challengeExpiredEvent({ processId, channelId, timestamp: 2 })),
    );
  });
});
