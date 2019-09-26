import {ethers} from 'ethers';
import {expectRevert} from '@statechannels/devtools';
// @ts-ignore
import ERC20AssetHolderArtifact from '../../../build/contracts/ERC20AssetHolder.json';
// @ts-ignore
import TokenArtifact from '../../../build/contracts/Token.json';
import {setupContracts} from '../../test-helpers';
import {Channel, getChannelId} from '../../../src/contract/channel';
import {AddressZero} from 'ethers/constants';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.GANACHE_PORT}`,
);
const signer0 = provider.getSigner(0); // convention matches setupContracts function
let signer0Address;
let ERC20AssetHolder: ethers.Contract;
let Token: ethers.Contract;
const chainId = '0x1234';
const participants = [];

// populate destinations array
for (let i = 0; i < 3; i++) {
  participants[i] = ethers.Wallet.createRandom().address;
}

beforeAll(async () => {
  ERC20AssetHolder = await setupContracts(provider, ERC20AssetHolderArtifact);
  Token = await setupContracts(provider, TokenArtifact);
  signer0Address = await signer0.getAddress();
});

const description0 = 'Deposits Tokens  (expectedHeld = 0)';
const description1 = 'Reverts deposit of Tokens (expectedHeld > holdings)';
const description2 = 'Reverts deposit of Tokens (expectedHeld + amount < holdings)';
const description3 = 'Deposits Tokens (amount < holdings < amount + expectedHeld)';

describe('deposit', () => {
  it.each`
    description     | channelNonce | held   | expectedHeld | amount | heldAfter | reasonString
    ${description0} | ${0}         | ${'0'} | ${'0'}       | ${'1'} | ${'1'}    | ${undefined}
    ${description1} | ${1}         | ${'0'} | ${'1'}       | ${'2'} | ${'0'}    | ${'Deposit | holdings[destination] is less than expected'}
    ${description2} | ${2}         | ${'3'} | ${'1'}       | ${'1'} | ${'3'}    | ${'Deposit | holdings[destination] already meets or exceeds expectedHeld + amount'}
    ${description3} | ${3}         | ${'3'} | ${'2'}       | ${'2'} | ${'4'}    | ${undefined}
  `('$description', async ({channelNonce, held, expectedHeld, amount, reasonString, heldAfter}) => {
    held = ethers.utils.bigNumberify(held);
    expectedHeld = ethers.utils.bigNumberify(expectedHeld);
    amount = ethers.utils.bigNumberify(amount);
    heldAfter = ethers.utils.bigNumberify(heldAfter);

    const destinationChannel: Channel = {chainId, channelNonce, participants};
    const destination = getChannelId(destinationChannel);

    // check msg.sender has enough tokens
    const balance = await Token.balanceOf(signer0Address);
    await expect(balance.gte(held.add(amount))).toBe(true);

    // Increase allowance
    await (await Token.increaseAllowance(ERC20AssetHolder.address, held.add(amount))).wait(); // approve enough for setup and main test

    // check allowance updated
    const allowance = await Token.allowance(signer0Address, ERC20AssetHolder.address);
    expect(
      allowance
        .sub(amount)
        .sub(held)
        .gte(0),
    ).toBe(true);

    if (held > 0) {
      // set holdings by depositing in the 'safest' way
      const {events} = await (await ERC20AssetHolder.deposit(destination, 0, held)).wait();
      expect(await ERC20AssetHolder.holdings(destination)).toEqual(held);
      const {data: amountTransferred} = getTransferEvent(events);
      expect(held.eq(amountTransferred)).toBe(true);
    }
    const tx = ERC20AssetHolder.deposit(destination, expectedHeld, amount);

    if (reasonString) {
      await expectRevert(() => tx, reasonString);
    } else {
      const balanceBefore = await Token.balanceOf(signer0Address);
      const {events} = await (await tx).wait();

      const depositedEvent = getDepositedEvent(events);
      expect(depositedEvent.args).toMatchObject({
        destination,
        amountDeposited: heldAfter.sub(held),
        destinationHoldings: heldAfter,
      });

      const {data: amountTransferred} = getTransferEvent(events);
      expect(heldAfter.sub(held).eq(amountTransferred)).toBe(true);

      const allocatedAmount = await ERC20AssetHolder.holdings(destination);
      await expect(allocatedAmount).toEqual(heldAfter);

      // check for any partial refund of tokens
      await expect(await Token.balanceOf(signer0Address)).toEqual(
        balanceBefore.sub(depositedEvent.args.amountDeposited),
      );
    }
  });
});

const getDepositedEvent = events => events.find(({event}) => event === 'Deposited');
const getTransferEvent = events =>
  events.find(({topics}) => topics[0] === Token.filters.Transfer(AddressZero).topics[0]);
