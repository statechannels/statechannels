import {ethers} from 'ethers';
import {expectRevert} from '@statechannels/devtools';
// @ts-ignore
import ETHAssetHolderArtifact from '../../../build/contracts/ETHAssetHolder.json';
import {setupContracts, newDepositedEvent, sendTransaction} from '../../test-helpers';
import {Channel, getChannelId} from '../../../src/contract/channel';
import {createDepositTransaction} from '../../../src/contract/transaction-creators/eth-asset-holder';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.GANACHE_PORT}`,
);
const signer = provider.getSigner(0); // convention matches setupContracts function
let ETHAssetHolder: ethers.Contract;
let depositedEvent;
const chainId = '0x1234';
const participants = [];

// populate destinations array
for (let i = 0; i < 3; i++) {
  participants[i] = ethers.Wallet.createRandom().address;
}

beforeAll(async () => {
  ETHAssetHolder = await setupContracts(provider, ETHAssetHolderArtifact);
});

const description0 = 'Deposits ETH (msg.value = amount , expectedHeld = 0)';
const description1 = 'Reverts deposit of ETH (msg.value = amount, expectedHeld > holdings)';
const description2 = 'Deposits ETH (msg.value = amount, expectedHeld + amount < holdings)';
const description3 =
  'Deposits ETH (msg.value = amount,  amount < holdings < amount + expectedHeld)';

// amounts are valueString represenationa of wei
describe('deposit', () => {
  it.each`
    description     | channelNonce | held   | expectedHeld | amount | msgValue | heldAfter | reasonString
    ${description0} | ${0}         | ${'0'} | ${'0'}       | ${'1'} | ${'1'}   | ${'1'}    | ${undefined}
    ${description1} | ${1}         | ${'0'} | ${'1'}       | ${'2'} | ${'2'}   | ${'0'}    | ${'Deposit | holdings[destination] is less than expected'}
    ${description2} | ${2}         | ${'3'} | ${'1'}       | ${'1'} | ${'1'}   | ${'3'}    | ${'Deposit | holdings[destination] already meets or exceeds expectedHeld + amount'}
    ${description3} | ${3}         | ${'3'} | ${'2'}       | ${'2'} | ${'2'}   | ${'4'}    | ${undefined}
  `(
    '$description',
    async ({channelNonce, held, expectedHeld, amount, msgValue, reasonString, heldAfter}) => {
      held = ethers.utils.parseUnits(held, 'wei');
      expectedHeld = ethers.utils.parseUnits(expectedHeld, 'wei');
      amount = ethers.utils.parseUnits(amount, 'wei');
      msgValue = ethers.utils.parseUnits(msgValue, 'wei');
      heldAfter = ethers.utils.parseUnits(heldAfter, 'wei');

      const destinationChannel: Channel = {chainId, channelNonce, participants};
      const destination = getChannelId(destinationChannel);

      // set holdings by depositing in the 'safest' way
      if (held > 0) {
        depositedEvent = newDepositedEvent(ETHAssetHolder, destination);
        await sendTransaction(provider, ETHAssetHolder.address, {
          value: held,
          ...createDepositTransaction(destination, '0x0', held),
        });

        expect(await ETHAssetHolder.holdings(destination)).toEqual(held);
        await depositedEvent;
      }

      const tx = ETHAssetHolder.deposit(destination, expectedHeld, amount, {
        value: msgValue,
      });

      // call method in a slightly different way if expecting a revert
      if (reasonString) {
        await expectRevert(() => tx, reasonString);
      } else {
        depositedEvent = newDepositedEvent(ETHAssetHolder, destination);
        const balanceBefore = await signer.getBalance();

        const receipt = await (await tx).wait();

        // catch Deposited event
        const event = receipt.events.pop().args;
        expect(event).toMatchObject({
          destination,
          amountDeposited: heldAfter.sub(held),
          destinationHoldings: heldAfter,
        });

        const allocatedAmount = await ETHAssetHolder.holdings(destination);
        await expect(allocatedAmount).toEqual(heldAfter);

        // check for any partial refund
        const gasCost = await tx.gasPrice.mul(receipt.cumulativeGasUsed);
        await expect(
          (await signer.getBalance()).eq(balanceBefore.sub(event.amountDeposited).sub(gasCost)),
        ).toBe(true);
      }
    },
  );
});
