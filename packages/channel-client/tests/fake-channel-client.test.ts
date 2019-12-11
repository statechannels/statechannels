import {Wallet} from 'ethers';

import {FakeChannelClient} from '../src/fake-channel-client';

describe('FakeChannelClient', () => {
  it('instantiates', () => {
    const client = new FakeChannelClient(Wallet.createRandom().address);
    expect(client).toBeDefined();
  });
});
