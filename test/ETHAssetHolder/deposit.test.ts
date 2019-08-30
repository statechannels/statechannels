import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import ETHAssetHolderArtifact from '../../build/contracts/ETHAssetHolder.json';
import {setupContracts} from '../test-helpers';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
let ETHAssetHolder: ethers.Contract;

const participants = ['', '', ''];
const wallets = new Array(3);
const EOAbytes32 = '0x' + 'eb89373c708B40fAeFA76e46cda92f801FAFa288'.padEnd(64, '0');
const depositAmount = ethers.utils.parseEther('0.01');

// populate wallets and participants array
for (let i = 0; i < 3; i++) {
  wallets[i] = ethers.Wallet.createRandom();
  participants[i] = wallets[i].address;
}

beforeAll(async () => {
  ETHAssetHolder = await setupContracts(provider, ETHAssetHolderArtifact);
});

const description1 = 'Deposits ETH (msg.value = amount , expectedHeld = 0)';

describe('deposit', () => {
  it.each`
    description     | destination   | held | expectedHeld | amount           | msgValue         | reasonString
    ${description1} | ${EOAbytes32} | ${0} | ${0}         | ${depositAmount} | ${depositAmount} | ${undefined}
  `(
    '$description', // for the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
    async ({destination, held, expectedHeld, amount, msgValue, reasonString}) => {
      // call method in a slightly different way if expecting a revert
      if (reasonString) {
        const regex = new RegExp(
          '^' + 'VM Exception while processing transaction: revert ' + reasonString + '$',
        );
        await expectRevert(
          () =>
            ETHAssetHolder.deposit(destination, expectedHeld, amount, {
              value: msgValue,
            }),
          regex,
        );
      } else {
        const tx = await ETHAssetHolder.deposit(destination, expectedHeld, amount, {
          value: msgValue,
        });
        // wait for tx to be mined
        await tx.wait();

        const allocatedAmount = await ETHAssetHolder.holdings(destination);
        await expect(allocatedAmount).toEqual(msgValue);
      }
    },
  );
});
