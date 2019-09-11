import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import ERC20AssetHolderArtifact from '../../build/contracts/ERC20AssetHolder.json';
// @ts-ignore
import TokenArtifact from '../../build/contracts/Token.json';
import {
  setupContracts,
  newDepositedEvent,
  newTransferEvent,
  sendTransaction,
} from '../test-helpers';
import {Channel, getChannelId} from '../../src/channel';
import {createDepositTransaction} from '../../src/transaction-creators/erc20-asset-holder';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
const signer0 = provider.getSigner(0); // convention matches setupContracts function
let signer0Address;
let ERC20AssetHolder: ethers.Contract;
let Token: ethers.Contract;
let depositedEvent;
let transferEvent;
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
    const zero = ethers.utils.bigNumberify('0');

    const destinationChannel: Channel = {chainId, channelNonce, participants};
    const destinationChannelId = getChannelId(destinationChannel);

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

    // set holdings by depositing in the 'safest' way

    if (held > 0) {
      depositedEvent = newDepositedEvent(ERC20AssetHolder, destinationChannelId);
      transferEvent = newTransferEvent(Token, ERC20AssetHolder.address);
      await sendTransaction(
        provider,
        ERC20AssetHolder.address,
        createDepositTransaction(destinationChannelId, zero.toHexString(), held),
      );
      expect(await ERC20AssetHolder.holdings(destinationChannelId)).toEqual(held);
      await depositedEvent;
      expect(await transferEvent).toEqual(held);
    }
    const transactionRequest = createDepositTransaction(destinationChannelId, expectedHeld, amount);

    // call method in a slightly different way if expecting a revert
    if (reasonString) {
      const regex = new RegExp(
        '^' + 'VM Exception while processing transaction: revert ' + reasonString + '$',
      );
      await expectRevert(
        () => sendTransaction(provider, ERC20AssetHolder.address, transactionRequest),
        regex,
      );
    } else {
      depositedEvent = newDepositedEvent(ERC20AssetHolder, destinationChannelId);
      transferEvent = newTransferEvent(Token, ERC20AssetHolder.address);
      const balanceBefore = await Token.balanceOf(signer0Address);
      await sendTransaction(provider, ERC20AssetHolder.address, transactionRequest);
      const [eventDestination, eventAmountDeposited, eventHoldings] = await depositedEvent;
      expect(eventDestination.toUpperCase()).toMatch(destinationChannelId.toUpperCase());
      expect(eventAmountDeposited).toEqual(heldAfter.sub(held));
      expect(eventHoldings).toEqual(heldAfter);

      // catch Transfer event
      expect(await transferEvent).toEqual(heldAfter.sub(held));

      const allocatedAmount = await ERC20AssetHolder.holdings(destinationChannelId);
      await expect(allocatedAmount).toEqual(heldAfter);

      // check for any partial refund of tokens
      await expect(await Token.balanceOf(signer0Address)).toEqual(
        balanceBefore.sub(eventAmountDeposited),
      );
    }
  });
});
