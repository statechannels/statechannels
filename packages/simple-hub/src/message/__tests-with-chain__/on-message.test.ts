import {from} from 'rxjs';
import {right} from 'fp-ts/lib/Either';
import {ledgerStateIncoming} from '../../wallet/test-helpers';
import {onIncomingMessage} from '../on-message';
import {deleteIncomingMessage} from '../firebase-relay';
import {mocked} from 'ts-jest/utils';

jest.mock('../firebase-relay');

describe('server: end to end test', () => {
  it('on valid message', async () => {
    mocked(deleteIncomingMessage).mockReturnValue(Promise.resolve());

    const observable = from([
      {
        snapshotKey: 'snap0',
        message: right({
          signedStates: [ledgerStateIncoming]
        })
      }
    ]);
    const subscriptionPromise = new Promise(resolve => onIncomingMessage(observable, resolve));
    await subscriptionPromise;

    expect(mocked(deleteIncomingMessage)).toHaveBeenCalled();
  });
});
