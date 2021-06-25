import {expectRevert} from '@statechannels/devtools';
import {ethers, Contract, Wallet, BigNumber, utils} from 'ethers';

const {AddressZero} = ethers.constants;

import TokenArtifact from '../../../artifacts/contracts/Token.sol/Token.json';
import {Channel, getChannelId} from '../../../src/contract/channel';
import {getRandomNonce, getTestProvider, setupContract} from '../../test-helpers';
import {TESTMultiAssetHolder} from '../../../typechain/TESTMultiAssetHolder';
import {Token} from '../../../typechain/Token';
// eslint-disable-next-line import/order
import TESTMultiAssetHolderArtifact from '../../../artifacts/contracts/test/TESTMultiAssetHolder.sol/TESTMultiAssetHolder.json';
const provider = getTestProvider();
const testMultiAssetHolder = (setupContract(
  provider,
  TESTMultiAssetHolderArtifact,
  process.env.TEST_MULTI_ASSET_HOLDER_ADDRESS
) as unknown) as TESTMultiAssetHolder & Contract;

const token = (setupContract(
  provider,
  TokenArtifact,
  process.env.TEST_TOKEN_ADDRESS
) as unknown) as Token & Contract;

const signer0 = getTestProvider().getSigner(0); // Convention matches setupContract function
let signer0Address;
const chainId = process.env.CHAIN_NETWORK_ID;
const participants = [];

// Populate destinations array
for (let i = 0; i < 3; i++) {
  participants[i] = Wallet.createRandom({extraEntropy: utils.id('erc20-deposit-test')}).address;
}

beforeAll(async () => {
  signer0Address = await signer0.getAddress();
});

const description0 = 'Deposits Tokens (expectedHeld = 0)';
const description1 = 'Deposits Tokens (expectedHeld = 1)';
const description2 = 'Reverts deposit of Tokens (expectedHeld > holdings)';
const description3 = 'Reverts deposit of Tokens (expectedHeld + amount < holdings)';
const description4 = 'Deposits Tokens (amount < holdings < amount + expectedHeld)';

describe('deposit', () => {
  let channelNonce = getRandomNonce('deposit');
  afterEach(() => {
    channelNonce++;
  });
  it.each`
    description     | held | expectedHeld | amount | heldAfter | reasonString
    ${description0} | ${0} | ${0}         | ${1}   | ${1}      | ${undefined}
    ${description1} | ${1} | ${1}         | ${1}   | ${2}      | ${undefined}
    ${description2} | ${0} | ${1}         | ${2}   | ${0}      | ${'holdings < expectedHeld'}
    ${description3} | ${3} | ${1}         | ${1}   | ${3}      | ${'holdings already sufficient'}
    ${description4} | ${3} | ${2}         | ${2}   | ${4}      | ${undefined}
  `('$description', async ({held, expectedHeld, amount, reasonString, heldAfter}) => {
    held = BigNumber.from(held);
    expectedHeld = BigNumber.from(expectedHeld);
    amount = BigNumber.from(amount);
    heldAfter = BigNumber.from(heldAfter);

    const destinationChannel: Channel = {chainId, channelNonce, participants};
    const destination = getChannelId(destinationChannel);

    // Check msg.sender has enough tokens
    const balance = await token.balanceOf(signer0Address);
    await expect(balance.gte(held.add(amount))).toBe(true);

    // Increase allowance
    await (await token.increaseAllowance(testMultiAssetHolder.address, held.add(amount))).wait(); // Approve enough for setup and main test

    // Check allowance updated
    const allowance = BigNumber.from(
      await token.allowance(signer0Address, testMultiAssetHolder.address)
    );
    expect(allowance.sub(amount).sub(held).gte(0)).toBe(true);

    if (held > 0) {
      // Set holdings by depositing in the 'safest' way
      const {events} = await (
        await testMultiAssetHolder.deposit(token.address, destination, 0, held)
      ).wait();
      expect(await testMultiAssetHolder.holdings(token.address, destination)).toEqual(held);
      const {data: amountTransferred} = getTransferEvent(events);
      expect(held.eq(amountTransferred)).toBe(true);
    }

    const balanceBefore = BigNumber.from(await token.balanceOf(signer0Address));
    const tx = testMultiAssetHolder.deposit(token.address, destination, expectedHeld, amount);

    if (reasonString) {
      await expectRevert(() => tx, reasonString);
    } else {
      const {events} = await (await tx).wait();

      const depositedEvent = getDepositedEvent(events);
      expect(depositedEvent).toMatchObject({
        destination,
        amountDeposited: heldAfter.sub(held),
        destinationHoldings: heldAfter,
      });

      const amountTransferred = BigNumber.from(getTransferEvent(events).data);
      expect(heldAfter.sub(held).eq(amountTransferred)).toBe(true);

      const allocatedAmount = await testMultiAssetHolder.holdings(token.address, destination);
      await expect(allocatedAmount).toEqual(heldAfter);

      // Check that the correct number of Tokens were deducted
      const balanceAfter = BigNumber.from(await token.balanceOf(signer0Address));
      expect(balanceAfter.eq(balanceBefore.sub(amountTransferred))).toBe(true);
    }
  });
});

const getDepositedEvent = events => events.find(({event}) => event === 'Deposited').args;
const getTransferEvent = events =>
  events.find(({topics}) => topics[0] === token.filters.Transfer(AddressZero).topics[0]);
