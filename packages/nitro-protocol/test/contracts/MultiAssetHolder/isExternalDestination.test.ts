import {Wallet} from 'ethers';

import {getTestProvider, setupContract} from '../../test-helpers';
import {TESTMultiAssetHolder} from '../../../typechain/TESTMultiAssetHolder';
import TESTMultiAssetHolderArtifact from '../../../artifacts/contracts/test/TESTMultiAssetHolder.sol/TESTMultiAssetHolder.json';
const provider = getTestProvider();

const testMultiAssetHolder = (setupContract(
  provider,
  TESTMultiAssetHolderArtifact,
  process.env.TEST_MULTI_ASSET_HOLDER_ADDRESS
) as unknown) as TESTMultiAssetHolder;

const participants = ['', '', ''];
const wallets = new Array(3);

// Populate wallets and participants array
for (let i = 0; i < 3; i++) {
  wallets[i] = Wallet.createRandom();
  participants[i] = wallets[i].address;
}

describe('isExternalDestination', () => {
  it('verifies an external destination', async () => {
    const zerosPaddedExternalDestination =
      '0x' + 'eb89373c708B40fAeFA76e46cda92f801FAFa288'.padStart(64, '0');
    expect(await testMultiAssetHolder.isExternalDestination(zerosPaddedExternalDestination)).toBe(
      true
    );
  });
  it('rejects a non-external-address', async () => {
    const onesPaddedExternalDestination =
      '0x' + 'eb89373c708B40fAeFA76e46cda92f801FAFa288'.padStart(64, '1');
    expect(await testMultiAssetHolder.isExternalDestination(onesPaddedExternalDestination)).toBe(
      false
    );
  });
});
