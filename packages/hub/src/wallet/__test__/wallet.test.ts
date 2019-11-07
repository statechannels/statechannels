import {State} from '@statechannels/nitro-protocol';
import Wallet from '..';
import {constructors as testDataConstructors} from '../../test/test_data';

let pre_fund_setup_0: State;

beforeEach(() => {
  pre_fund_setup_0 = testDataConstructors.pre_fund_setup(0);
});

describe('sanitize', () => {
  it('sanitizes application attributes with the sanitize method it was passed', async () => {
    const wallet = new Wallet(() => '0xf00');
    expect(wallet.sanitize(pre_fund_setup_0.appData)).toEqual('0xf00');
  });
});
