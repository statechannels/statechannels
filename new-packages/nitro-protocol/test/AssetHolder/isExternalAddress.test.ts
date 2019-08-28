import {ethers} from 'ethers';
// @ts-ignore
import AssetHolderArtifact from '../../build/contracts/AssetHolder.json';
import {setupContracts} from '../test-helpers';
import {zeros} from 'ethereumjs-util';
import {formatBytes32String, defaultAbiCoder} from 'ethers/utils';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
let AssetHolder: ethers.Contract;

const participants = ['', '', ''];
const wallets = new Array(3);

// populate wallets and participants array
for (let i = 0; i < 3; i++) {
  wallets[i] = ethers.Wallet.createRandom();
  participants[i] = wallets[i].address;
}

beforeAll(async () => {
  AssetHolder = await setupContracts(provider, AssetHolderArtifact);
});

describe('isExternalAddress', () => {
  const zerosPaddedExternalAddress =
    '0x' + 'eb89373c708B40fAeFA76e46cda92f801FAFa288'.padEnd(64, '0');
  const onesPaddedExternalAddress =
    '0x' + 'eb89373c708B40fAeFA76e46cda92f801FAFa288'.padEnd(64, '1');
  it('verifies an external address', async () => {
    expect(await AssetHolder.isExternalAddress(zerosPaddedExternalAddress)).toBe(true);
  });
  it('rejects a non-external-address', async () => {
    expect(await AssetHolder.isExternalAddress(onesPaddedExternalAddress)).toBe(false);
  });
});
