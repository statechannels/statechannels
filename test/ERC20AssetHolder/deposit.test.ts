import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import ERC20AssetHolderArtifact from '../../build/contracts/ERC20AssetHolder.json';
// @ts-ignore
import TokenArtifact from '../../build/contracts/Token.json';
import {setupContracts, newDepositedEvent, newTransferEvent} from '../test-helpers';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
const signer0 = provider.getSigner(0); // convention matches setupContracts function
let signer0Address;
let ERC20AssetHolder: ethers.Contract;
let Token: ethers.Contract;
let depositedEvent;
let transferEvent;
const destinations = [];

// populate destinations array
for (let i = 0; i < 4; i++) {
  destinations[i] = ethers.Wallet.createRandom().address.padEnd(66, '0');
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
    description     | destination        | held   | expectedHeld | amount | heldAfter | reasonString
    ${description0} | ${destinations[0]} | ${'0'} | ${'0'}       | ${'1'} | ${'1'}    | ${undefined}
    ${description1} | ${destinations[1]} | ${'0'} | ${'1'}       | ${'2'} | ${'0'}    | ${'Deposit | holdings[destination] is less than expected'}
    ${description2} | ${destinations[2]} | ${'3'} | ${'1'}       | ${'1'} | ${'3'}    | ${'Deposit | holdings[destination] already meets or exceeds expectedHeld + amount'}
    ${description3} | ${destinations[3]} | ${'3'} | ${'2'}       | ${'2'} | ${'4'}    | ${undefined}
  `('$description', async ({destination, held, expectedHeld, amount, reasonString, heldAfter}) => {
    held = ethers.utils.bigNumberify(held);
    expectedHeld = ethers.utils.bigNumberify(expectedHeld);
    amount = ethers.utils.bigNumberify(amount);
    heldAfter = ethers.utils.bigNumberify(heldAfter);
    const zero = ethers.utils.bigNumberify('0');

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
      depositedEvent = newDepositedEvent(ERC20AssetHolder, destination);
      transferEvent = newTransferEvent(Token, ERC20AssetHolder.address);
      await (await ERC20AssetHolder.deposit(destination, zero, held)).wait();
      expect(await ERC20AssetHolder.holdings(destination)).toEqual(held);
      await depositedEvent;
      expect(await transferEvent).toEqual(held);
    }

    // call method in a slightly different way if expecting a revert
    if (reasonString) {
      const regex = new RegExp(
        '^' + 'VM Exception while processing transaction: revert ' + reasonString + '$',
      );
      await expectRevert(() => ERC20AssetHolder.deposit(destination, expectedHeld, amount), regex);
    } else {
      depositedEvent = newDepositedEvent(ERC20AssetHolder, destination);
      transferEvent = newTransferEvent(Token, ERC20AssetHolder.address);
      const balanceBefore = await Token.balanceOf(signer0Address);
      const tx = await ERC20AssetHolder.deposit(destination, expectedHeld, amount);
      // wait for tx to be mined
      await tx.wait();

      // catch Deposited event
      const [eventDestination, eventAmountDeposited, eventHoldings] = await depositedEvent;
      expect(eventDestination.toUpperCase()).toMatch(destination.toUpperCase());
      expect(eventAmountDeposited).toEqual(heldAfter.sub(held));
      expect(eventHoldings).toEqual(heldAfter);

      // catch Transfer event
      expect(await transferEvent).toEqual(heldAfter.sub(held));

      const allocatedAmount = await ERC20AssetHolder.holdings(destination);
      await expect(allocatedAmount).toEqual(heldAfter);

      // check for any partial refund of tokens
      await expect(await Token.balanceOf(signer0Address)).toEqual(
        balanceBefore.sub(eventAmountDeposited),
      );
    }
  });
});
