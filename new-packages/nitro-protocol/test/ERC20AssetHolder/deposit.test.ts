import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import ERC20AssetHolderArtifact from '../../build/contracts/ERC20AssetHolder.json';
// @ts-ignore
import TokenArtifact from '../../build/contracts/Token.json';
import {setupContracts, newDepositedEvent} from '../test-helpers';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
const signer0 = provider.getSigner(0); // convention matches setupContracts function
let signer0Address;
let ERC20AssetHolder: ethers.Contract;
let Token: ethers.Contract;
let depositedEvent;

beforeAll(async () => {
  ERC20AssetHolder = await setupContracts(provider, ERC20AssetHolderArtifact);
  Token = await setupContracts(provider, TokenArtifact);
  signer0Address = await signer0.getAddress();
});

const description1 = 'Deposits Tokens (msg.value = amount , expectedHeld = 0)';
const description2 = 'Reverts deposit of Tokens (msg.value = amount, expectedHeld > holdings)';
const description3 = 'Deposits Tokens (msg.value = amount, expectedHeld + amount < holdings)';
const description4 =
  'Deposits Tokens (msg.value = amount,  amount < holdings < amount + expectedHeld)';

// amounts are valueString represenationa of wei
describe('deposit', () => {
  it.each`
    description     | destinationType       | held   | expectedHeld | amount | msgValue | heldAfter | reasonString
    ${description1} | ${'randomEOABytes32'} | ${'0'} | ${'0'}       | ${'1'} | ${'1'}   | ${'1'}    | ${undefined}
    ${description2} | ${'randomEOABytes32'} | ${'0'} | ${'1'}       | ${'2'} | ${'2'}   | ${'0'}    | ${'Deposit | holdings[destination] is less than expected'}
    ${description3} | ${'randomEOABytes32'} | ${'3'} | ${'1'}       | ${'1'} | ${'1'}   | ${'3'}    | ${undefined}
    ${description4} | ${'randomEOABytes32'} | ${'3'} | ${'2'}       | ${'2'} | ${'2'}   | ${'4'}    | ${undefined}
  `(
    '$description',
    async ({destinationType, held, expectedHeld, amount, msgValue, reasonString, heldAfter}) => {
      held = ethers.utils.bigNumberify(held);
      expectedHeld = ethers.utils.bigNumberify(expectedHeld);
      amount = ethers.utils.bigNumberify(amount);
      msgValue = ethers.utils.bigNumberify(msgValue);
      heldAfter = ethers.utils.bigNumberify(heldAfter);

      let destination;
      if (destinationType === 'randomEOABytes32') {
        const randomAddress = ethers.Wallet.createRandom().address;
        destination = randomAddress.padEnd(66, '0');
      }

      // check msg.sender has enough tokens
      const balance = await Token.balanceOf(signer0Address);
      await expect(balance.gte(held.add(amount))).toBe(true);

      // Increase allowance by calling approve
      await (await Token.approve(ERC20AssetHolder.address, held.add(amount))).wait(); // approve enough for setup and main test

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
        await (await ERC20AssetHolder.deposit(destination, 0, held)).wait();
        expect(await ERC20AssetHolder.holdings(destination)).toEqual(held);
      }

      // TODO catch ERC20 transfer event

      // call method in a slightly different way if expecting a revert
      if (reasonString) {
        const regex = new RegExp(
          '^' + 'VM Exception while processing transaction: revert ' + reasonString + '$',
        );
        await expectRevert(
          () =>
            ERC20AssetHolder.deposit(destination, expectedHeld, amount, {
              value: msgValue,
            }),
          regex,
        );
      } else {
        depositedEvent = newDepositedEvent(ERC20AssetHolder, destination);
        const balanceBefore = await Token.balanceOf(signer0Address);
        const tx = await ERC20AssetHolder.deposit(destination, expectedHeld, amount);
        // wait for tx to be mined
        const receipt = await tx.wait();

        // catch Deposited event
        const [eventDestination, eventAmountDeposited, eventHoldings] = await depositedEvent;
        expect(eventDestination.toUpperCase()).toMatch(destination.toUpperCase());
        expect(eventAmountDeposited).toEqual(heldAfter.sub(held));
        expect(eventHoldings).toEqual(heldAfter);

        const allocatedAmount = await ERC20AssetHolder.holdings(destination);
        await expect(allocatedAmount).toEqual(heldAfter);

        // check for any partial refund of tokens
        await expect(await Token.balanceOf(signer0Address)).toEqual(
          balanceBefore.sub(eventAmountDeposited),
        );
      }
    },
  );
});
