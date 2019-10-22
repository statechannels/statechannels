// @ts-ignore
import {Contract, Wallet} from 'ethers';
import {arrayify, id} from 'ethers/utils';
import ForceMoveArtifact from '../../../build/contracts/TESTForceMove.json';
import {getTestProvider, setupContracts, sign} from '../../test-helpers';

const provider = getTestProvider();
let ForceMove: Contract;

const participants = ['', '', ''];
const wallets = new Array(3);

// populate wallets and participants array
for (let i = 0; i < 3; i++) {
  wallets[i] = Wallet.createRandom();
  participants[i] = wallets[i].address;
}

beforeAll(async () => {
  ForceMove = await setupContracts(provider, ForceMoveArtifact);
});

describe('_recoverSigner', () => {
  it('recovers the signer correctly', async () => {
    // following https://docs.ethers.io/ethers.js/html/cookbook-signing.html
    const privateKey = '0x0123456789012345678901234567890123456789012345678901234567890123';
    const wallet = new Wallet(privateKey);
    const msgHash = id('Hello World');
    const msgHashBytes = arrayify(msgHash);
    const sig = await sign(wallet, msgHashBytes);
    expect(await ForceMove.recoverSigner(msgHash, sig)).toEqual(wallet.address);
  });
});
