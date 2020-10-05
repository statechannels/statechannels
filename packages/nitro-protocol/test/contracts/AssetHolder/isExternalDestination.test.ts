import {Contract, Wallet} from 'ethers';

import AssetHolderArtifact from '../../../build/contracts/TESTAssetHolder.json';
import {getTestProvider, setupContracts} from '../../test-helpers';

const provider = getTestProvider();

let AssetHolder: Contract;

const participants = ['', '', ''];
const wallets = new Array(3);

// Populate wallets and participants array
for (let i = 0; i < 3; i++) {
  wallets[i] = Wallet.createRandom();
  participants[i] = wallets[i].address;
}

beforeAll(async () => {
  AssetHolder = await setupContracts(
    provider,
    AssetHolderArtifact,
    process.env.TEST_ASSET_HOLDER_ADDRESS
  );
});

describe('isExternalDestination', () => {
  it('verifies an external destination', async () => {
    const zerosPaddedExternalDestination =
      '0x' + 'eb89373c708B40fAeFA76e46cda92f801FAFa288'.padStart(64, '0');
    expect(await AssetHolder.isExternalDestination(zerosPaddedExternalDestination)).toBe(true);
  });
  it('rejects a non-external-address', async () => {
    const onesPaddedExternalDestination =
      '0x' + 'eb89373c708B40fAeFA76e46cda92f801FAFa288'.padStart(64, '1');
    expect(await AssetHolder.isExternalDestination(onesPaddedExternalDestination)).toBe(false);
  });
});
