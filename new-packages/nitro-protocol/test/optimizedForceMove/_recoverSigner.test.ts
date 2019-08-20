import {ethers} from 'ethers';
// @ts-ignore
import optimizedForceMoveArtifact from '../../build/contracts/TESTOptimizedForceMove.json';
import {arrayify} from 'ethers/utils';
import {setupContracts, sign} from './test-helpers';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
let optimizedForceMove: ethers.Contract;

const participants = ['', '', ''];
const wallets = new Array(3);

// populate wallets and participants array
for (let i = 0; i < 3; i++) {
  wallets[i] = ethers.Wallet.createRandom();
  participants[i] = wallets[i].address;
}

beforeAll(async () => {
  optimizedForceMove = await setupContracts(provider, optimizedForceMoveArtifact);
});

describe('_recoverSigner', () => {
  it('recovers the signer correctly', async () => {
    // following https://docs.ethers.io/ethers.js/html/cookbook-signing.html
    const privateKey = '0x0123456789012345678901234567890123456789012345678901234567890123';
    const wallet = new ethers.Wallet(privateKey);
    const msgHash = ethers.utils.id('Hello World');
    const msgHashBytes = arrayify(msgHash);
    const sig = await sign(wallet, msgHashBytes);
    expect(await optimizedForceMove.recoverSigner(msgHash, sig.v, sig.r, sig.s)).toEqual(
      wallet.address,
    );
  });
});
