import {ethers} from 'ethers';
import {expectRevert} from '@statechannels/devtools';
// @ts-ignore
import ETHAssetHolderArtifact from '../../../build/contracts/ETHAssetHolder.json';
import {setupContracts, getTestProvider} from '../../test-helpers';
import {Channel, getChannelId} from '../../../src/contract/channel';
import {bigNumberify} from 'ethers/utils';

const provider = getTestProvider();
// const signer = provider.getSigner(0); // convention matches setupContracts function
let ETHAssetHolder: ethers.Contract;
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
    description     | channelNonce | held   | expectedHeld | amount | msgValue | heldAfterString | reasonString
    ${description0} | ${0}         | ${'0'} | ${'0'}       | ${'1'} | ${'1'}   | ${'1'}          | ${undefined}
    ${description1} | ${1}         | ${'0'} | ${'1'}       | ${'2'} | ${'2'}   | ${'0'}          | ${'Deposit | holdings[destination] is less than expected'}
    ${description2} | ${2}         | ${'3'} | ${'1'}       | ${'1'} | ${'1'}   | ${'3'}          | ${'Deposit | holdings[destination] already meets or exceeds expectedHeld + amount'}
    ${description3} | ${3}         | ${'3'} | ${'2'}       | ${'2'} | ${'2'}   | ${'4'}          | ${undefined}
  `(
    '$description',
    async ({channelNonce, held, expectedHeld, amount, msgValue, reasonString, heldAfterString}) => {
      held = ethers.utils.parseUnits(held, 'wei');
      expectedHeld = ethers.utils.parseUnits(expectedHeld, 'wei');
      amount = ethers.utils.parseUnits(amount, 'wei');
      msgValue = ethers.utils.parseUnits(msgValue, 'wei');
      const heldAfter = ethers.utils.parseUnits(heldAfterString, 'wei');

      const destinationChannel: Channel = {chainId, channelNonce, participants};
      const destination = getChannelId(destinationChannel);

      if (held > 0) {
        // set holdings by depositing in the 'safest' way
        const tx0 = ETHAssetHolder.deposit(destination, '0x0', held, {
          value: held,
        });
        const {events} = await (await tx0).wait();
        const depositedEvent = getDepositedEvent(events);

        expect(await ETHAssetHolder.holdings(destination)).toEqual(held);
        expect(depositedEvent).toMatchObject({
          destination,
          amountDeposited: bigNumberify(held),
          destinationHoldings: bigNumberify(held),
        });
      }
      const tx = ETHAssetHolder.deposit(destination, expectedHeld, amount, {
        value: msgValue,
      });

      if (reasonString) {
        await expectRevert(() => tx, reasonString);
      } else {
        // const balanceBefore = await signer.getBalance();

        const {events} = await (await tx).wait();
        const event = getDepositedEvent(events);
        expect(event).toMatchObject({
          destination,
          amountDeposited: heldAfter.sub(held),
          destinationHoldings: heldAfter,
        });

        const allocatedAmount = await ETHAssetHolder.holdings(destination);
        await expect(allocatedAmount).toEqual(heldAfter);

        // check for any partial refund
        // const gasCost = (await provider.getGasPrice()).mul(cumulativeGasUsed);
        // await expect(await signer.getBalance()).toEqual(
        //   balanceBefore.sub(event.amountDeposited).sub(gasCost),
        // );
      }
    },
  );
});

const getDepositedEvent = events => events.find(({event}) => event === 'Deposited').args;
