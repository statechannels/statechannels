// @ts-ignore
import {Contract, Wallet} from 'ethers';
import AssetHolderArtifact from '../../../build/contracts/TESTAssetHolder.json';
import {getTestProvider, setupContracts} from '../../test-helpers';

const provider = getTestProvider();

let AssetHolder: Contract;

const participants = ['', '', ''];
const wallets = new Array(3);

// populate wallets and participants array
for (let i = 0; i < 3; i++) {
  wallets[i] = Wallet.createRandom();
  participants[i] = wallets[i].address;
}

beforeAll(async () => {
  AssetHolder = await setupContracts(provider, AssetHolderArtifact);
});

describe('isExternalAddress', () => {
  it('verifies an external address', async () => {
    const zerosPaddedExternalAddress =
      '0x' + 'eb89373c708B40fAeFA76e46cda92f801FAFa288'.padEnd(64, '0');
    expect(await AssetHolder.isExternalAddress(zerosPaddedExternalAddress)).toBe(true);
  });
  it('rejects a non-external-address', async () => {
    const onesPaddedExternalAddress =
      '0x' + 'eb89373c708B40fAeFA76e46cda92f801FAFa288'.padEnd(64, '1');
    expect(await AssetHolder.isExternalAddress(onesPaddedExternalAddress)).toBe(false);
  });
});
