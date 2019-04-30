import { DUMMY_RULES_ADDRESS } from '../../src/constants';
import { Blockchain } from '../../src/wallet/services/blockchain';
import { nitroAdjudicator } from '../../src/wallet/utilities/blockchain';

process.env.NODE_ENV = 'test';
jest.setTimeout(30000);

let nitro: any;

beforeAll(async () => {
  nitro = await nitroAdjudicator();
});

describe.skip('fund', () => {
  it('works', async () => {
    const address = DUMMY_RULES_ADDRESS; // just needs to be a valid address
    const oldBalance = await nitro.holdings(address);
    await Blockchain.fund(address, '0x05');
    expect(await nitro.holdings(address)).toMatchObject(oldBalance.add('0x05'));
  });
});

describe.skip('holdings', () => {
  it('works', async () => {
    const address = DUMMY_RULES_ADDRESS; // just needs to be a valid address
    const oldBalance = await nitro.holdings(address);
    const tx = await Blockchain.fund(address, '0x05');
    expect(await nitro.holdings(address)).toMatchObject(oldBalance.add('0x05'));
  });
});
