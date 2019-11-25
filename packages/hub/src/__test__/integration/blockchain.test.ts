import {DUMMY_RULES_ADDRESS} from '../../test/test-constants';
import {Blockchain} from '../../wallet/services/blockchain';
import {ethAssetHolder} from '../../wallet/utilities/blockchain';

jest.setTimeout(30000);

let nitro: any;

beforeAll(async () => {
  nitro = await ethAssetHolder();
});

describe.skip('fund', () => {
  it('works', async () => {
    const address = DUMMY_RULES_ADDRESS; // Just needs to be a valid address
    const oldBalance = await nitro.holdings(address);
    await Blockchain.fund(address, '0x00', '0x05');
    expect(await nitro.holdings(address)).toMatchObject(oldBalance.add('0x05'));
  });
});

describe.skip('holdings', () => {
  it('works', async () => {
    const address = DUMMY_RULES_ADDRESS; // Just needs to be a valid address
    const oldBalance = await nitro.holdings(address);
    await Blockchain.fund(address, '0x00', '0x05');
    expect(await nitro.holdings(address)).toMatchObject(oldBalance.add('0x05'));
  });
});
