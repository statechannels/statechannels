import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import ETHAssetHolderArtifact from '../../build/contracts/ETHAssetHolder.json';
import {setupContracts, newDepositedEvent, sendTransaction} from '../test-helpers';
import {Channel, getChannelId} from '../../src/channel';
import {createDepositTransaction} from '../../src/transaction-creators/eth-asset-holder';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
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
      const destinationChannelId = getChannelId(destinationChannel);

      // set holdings by depositing in the 'safest' way
      if (held > 0) {
        depositedEvent = newDepositedEvent(ETHAssetHolder, destinationChannelId);
        await sendTransaction(provider, ETHAssetHolder.address, {
          value: held,
          ...createDepositTransaction(destinationChannelId, '0x0', held),
        });

        expect(await ETHAssetHolder.holdings(destinationChannelId)).toEqual(held);
        await depositedEvent;
      }

      const transactionRequest = {
        ...createDepositTransaction(destinationChannelId, expectedHeld, amount),
        value: msgValue,
      };
      // call method in a slightly different way if expecting a revert
      if (reasonString) {
        const regex = new RegExp(
          '^' + 'VM Exception while processing transaction: revert ' + reasonString + '$',
        );
        await expectRevert(
          () => sendTransaction(provider, ETHAssetHolder.address, transactionRequest),
          regex,
        );
      } else {
        depositedEvent = newDepositedEvent(ETHAssetHolder, destinationChannelId);
        const balanceBefore = await signer.getBalance();

        const tx = await signer.sendTransaction({
          to: ETHAssetHolder.address,
          ...transactionRequest,
        });
        const receipt = await tx.wait();

        // catch Deposited event
        const [eventDestination, eventAmountDeposited, eventHoldings] = await depositedEvent;
        expect(eventDestination.toUpperCase()).toMatch(destinationChannelId.toUpperCase());
        expect(eventAmountDeposited).toEqual(heldAfter.sub(held));
        expect(eventHoldings).toEqual(heldAfter);

        const allocatedAmount = await ETHAssetHolder.holdings(destinationChannelId);
        await expect(allocatedAmount).toEqual(heldAfter);

        // check for any partial refund
        const gasCost = await tx.gasPrice.mul(receipt.cumulativeGasUsed);
        await expect(
          (await signer.getBalance()).eq(balanceBefore.sub(eventAmountDeposited).sub(gasCost)),
        ).toBe(true);
      }
    },
  );
});
