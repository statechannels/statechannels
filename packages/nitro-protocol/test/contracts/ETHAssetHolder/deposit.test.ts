import {expectRevert} from '@statechannels/devtools';
import {Contract, Wallet, utils, BigNumber} from 'ethers';
// @ts-ignore
import ETHAssetHolderArtifact from '../../../build/contracts/TestEthAssetHolder.json';
import {Channel, getChannelId} from '../../../src/contract/channel';
import {getTestProvider, setupContracts, writeGasConsumption} from '../../test-helpers';

const provider = getTestProvider();
let ETHAssetHolder: Contract;
const chainId = '0x1234';
const participants = [];

// Populate destinations array
for (let i = 0; i < 3; i++) {
  participants[i] = Wallet.createRandom().address;
}

beforeAll(async () => {
  ETHAssetHolder = await setupContracts(
    provider,
    ETHAssetHolderArtifact,
    process.env.TEST_ETH_ASSET_HOLDER_ADDRESS
  );
});

const description0 = 'Deposits ETH (msg.value = amount , expectedHeld = 0)';
const description1 = 'Reverts deposit of ETH (msg.value = amount, expectedHeld > holdings)';
const description2 = 'Deposits ETH (msg.value = amount, expectedHeld + amount < holdings)';
const description3 =
  'Deposits ETH (msg.value = amount,  amount < holdings < amount + expectedHeld)';

// Amounts are valueString represenationa of wei
describe('deposit', () => {
  it.each`
    description     | channelNonce | held   | expectedHeld | amount | msgValue | heldAfterString | reasonString
    ${description0} | ${0}         | ${'0'} | ${'0'}       | ${'1'} | ${'1'}   | ${'1'}          | ${undefined}
    ${description1} | ${1}         | ${'0'} | ${'1'}       | ${'2'} | ${'2'}   | ${'0'}          | ${'Deposit | holdings[destination] is less than expected'}
    ${description2} | ${2}         | ${'3'} | ${'1'}       | ${'1'} | ${'1'}   | ${'3'}          | ${'Deposit | holdings[destination] already meets or exceeds expectedHeld + amount'}
    ${description3} | ${3}         | ${'3'} | ${'2'}       | ${'2'} | ${'2'}   | ${'4'}          | ${undefined}
  `(
    '$description',
    async ({
      description,
      channelNonce,
      held,
      expectedHeld,
      amount,
      msgValue,
      reasonString,
      heldAfterString,
    }) => {
      held = utils.parseUnits(held, 'wei');
      expectedHeld = utils.parseUnits(expectedHeld, 'wei');
      amount = utils.parseUnits(amount, 'wei');
      msgValue = utils.parseUnits(msgValue, 'wei');
      const heldAfter = utils.parseUnits(heldAfterString, 'wei');

      const destinationChannel: Channel = {chainId, channelNonce, participants};
      const destination = getChannelId(destinationChannel);

      if (held > 0) {
        // Set holdings by depositing in the 'safest' way
        const tx0 = ETHAssetHolder.deposit(destination, '0x0', held, {
          value: held,
        });
        const {events} = await (await tx0).wait();
        const depositedEvent = getDepositedEvent(events);

        expect(BigNumber.from((await ETHAssetHolder.holdings(destination)).eq(held))).toBe(true);
        expect(depositedEvent).toMatchObject({
          destination,
          amountDeposited: BigNumber.from(held),
          destinationHoldings: BigNumber.from(held),
        });
      }
      const tx = ETHAssetHolder.deposit(destination, expectedHeld, amount, {
        value: msgValue,
      });

      if (reasonString) {
        await expectRevert(() => tx, reasonString);
      } else {
        const {gasUsed, events} = await (await tx).wait();
        await writeGasConsumption('./deposit.gas.md', description, gasUsed);
        const event = getDepositedEvent(events);
        expect(event).toMatchObject({
          destination,
          amountDeposited: heldAfter.sub(held),
          destinationHoldings: heldAfter,
        });

        const allocatedAmount = await ETHAssetHolder.holdings(destination);
        await expect(allocatedAmount).toEqual(heldAfter);
      }
    }
  );
});

const getDepositedEvent = events => events.find(({event}) => event === 'Deposited').args;
