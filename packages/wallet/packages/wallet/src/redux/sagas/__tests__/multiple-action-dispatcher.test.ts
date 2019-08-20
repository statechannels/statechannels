import { put, take } from 'redux-saga/effects';

import * as actions from '../../actions';
import { multipleActionDispatcher } from '../multiple-action-dispatcher';
import { closeLedgerChannel } from '../../protocols/actions';
import { exitChallenge } from '../../protocols/dispute/challenger/actions';

describe('multiple action dispatcher', () => {
  const saga = multipleActionDispatcher();
  const mockMultipleActions = actions.multipleWalletActions({
    actions: [
      closeLedgerChannel({ channelId: '0xchannelId' }),
      exitChallenge({ processId: 'Process-0x' }),
    ],
  });

  it('waits for multiple actions to arrive', () => {
    expect(saga.next().value).toEqual(
      take(['WALLET.MULTIPLE_ACTIONS', 'WALLET.MULTIPLE_RELAYABLE_ACTIONS']),
    );
  });

  it('puts the actions in order', () => {
    const output = saga.next(mockMultipleActions).value;
    expect(output[0]).toEqual(put(closeLedgerChannel({ channelId: '0xchannelId' })));
    expect(output[1]).toEqual(put(exitChallenge({ processId: 'Process-0x' })));
  });
});
