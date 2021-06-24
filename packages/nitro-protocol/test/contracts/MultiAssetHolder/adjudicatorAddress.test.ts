import {Contract} from 'ethers';

import {getTestProvider, setupContract} from '../../test-helpers';

const provider = getTestProvider();
let AssetHolder: Contract;

describe('AdjudicatorAddress', () => {
  it('Exposes the address to a call', async () => {
    expect(await AssetHolder.AdjudicatorAddress()).toEqual(
      process.env.TEST_NITRO_ADJUDICATOR_ADDRESS
    );
  });
});
