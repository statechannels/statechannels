import {State} from '@statechannels/nitro-protocol';
import {stateConstructors as testDataConstructors} from '../../test/test-data';
import Wallet from '..';

let preFundSetup0: State;

beforeEach(() => {
  preFundSetup0 = testDataConstructors.prefundSetup(0);
});

describe('sanitize', () => {
  it('sanitizes application attributes with the sanitize method it was passed', async () => {
    const wallet = new Wallet(() => '0xf00');
    expect(wallet.sanitize(preFundSetup0.appData)).toEqual('0xf00');
  });
});
