import {expectRevert} from '@statechannels/devtools';
import {ethers, Contract, Wallet, BigNumber, utils} from 'ethers';

const {AddressZero} = ethers.constants;

import ERC20AssetHolderArtifact from '../../../artifacts/contracts//test/TestErc20AssetHolder.sol/TestErc20AssetHolder.json';
import TokenArtifact from '../../../artifacts/contracts/Token.sol/Token.json';
import {Channel, getChannelId} from '../../../src/contract/channel';
import {
  getRandomNonce,
  getTestProvider,
  setupContracts,
  writeGasConsumption,
} from '../../test-helpers';

const provider = getTestProvider();
const signer0 = provider.getSigner(0); // Convention matches setupContracts function
let signer0Address;
let ERC20AssetHolder: Contract;
let Token: Contract;
const chainId = '0x1234';
const participants = [];

// Populate destinations array
for (let i = 0; i < 3; i++) {
  participants[i] = Wallet.createRandom({extraEntropy: utils.id('erc20-deposit-test')}).address;
}

beforeAll(async () => {
  ERC20AssetHolder = await setupContracts(
    provider,
    ERC20AssetHolderArtifact,
    process.env.TEST_TOKEN_ASSET_HOLDER_ADDRESS
  );
  Token = await setupContracts(provider, TokenArtifact, process.env.TEST_TOKEN_ADDRESS);
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
    ${description2} | ${0} | ${1}         | ${2}   | ${0}      | ${'Deposit | holdings[destination] is less than expected'}
    ${description3} | ${3} | ${1}         | ${1}   | ${3}      | ${'Deposit | holdings[destination] already meets or exceeds expectedHeld + amount'}
    ${description4} | ${3} | ${2}         | ${2}   | ${4}      | ${undefined}
  `('$description', async ({description, held, expectedHeld, amount, reasonString, heldAfter}) => {
    held = BigNumber.from(held);
    expectedHeld = BigNumber.from(expectedHeld);
    amount = BigNumber.from(amount);
    heldAfter = BigNumber.from(heldAfter);

    const destinationChannel: Channel = {chainId, channelNonce, participants};
    const destination = getChannelId(destinationChannel);

    // Check msg.sender has enough tokens
    const balance = await Token.balanceOf(signer0Address);
    await expect(balance.gte(held.add(amount))).toBe(true);

    // Increase allowance
    await (await Token.increaseAllowance(ERC20AssetHolder.address, held.add(amount))).wait(); // Approve enough for setup and main test

    // Check allowance updated
    const allowance = BigNumber.from(
      await Token.allowance(signer0Address, ERC20AssetHolder.address)
    );
    expect(
      allowance
        .sub(amount)
        .sub(held)
        .gte(0)
    ).toBe(true);

    if (held > 0) {
      // Set holdings by depositing in the 'safest' way
      const {events} = await (await ERC20AssetHolder.deposit(destination, 0, held)).wait();
      expect(await ERC20AssetHolder.holdings(destination)).toEqual(held);
      const {data: amountTransferred} = getTransferEvent(events);
      expect(held.eq(amountTransferred)).toBe(true);
    }

    const balanceBefore = BigNumber.from(await Token.balanceOf(signer0Address));
    const tx = ERC20AssetHolder.deposit(destination, expectedHeld, amount);

    if (reasonString) {
      await expectRevert(() => tx, reasonString);
    } else {
      const {gasUsed, events} = await (await tx).wait();
      await writeGasConsumption('./erc20-deposit.gas.md', description, gasUsed);

      const depositedEvent = getDepositedEvent(events);
      expect(depositedEvent).toMatchObject({
        destination,
        amountDeposited: heldAfter.sub(held),
        destinationHoldings: heldAfter,
      });

      const amountTransferred = BigNumber.from(getTransferEvent(events).data);
      expect(heldAfter.sub(held).eq(amountTransferred)).toBe(true);

      const allocatedAmount = await ERC20AssetHolder.holdings(destination);
      await expect(allocatedAmount).toEqual(heldAfter);

      // Check that the correct number of Tokens were deducted
      const balanceAfter = BigNumber.from(await Token.balanceOf(signer0Address));
      expect(balanceAfter.eq(balanceBefore.sub(amountTransferred))).toBe(true);
    }
  });
});

const getDepositedEvent = events => events.find(({event}) => event === 'Deposited').args;
const getTransferEvent = events =>
  events.find(({topics}) => topics[0] === Token.filters.Transfer(AddressZero).topics[0]);
