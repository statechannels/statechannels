import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import ERC20AssetHolderArtifact from '../../build/contracts/ERC20AssetHolder.json';
// @ts-ignore
import TokenArtifact from '../../build/contracts/Token.json';
import {setupContracts, sign, newDepositedEvent, newTransferEvent} from '../test-helpers';
import {keccak256, defaultAbiCoder} from 'ethers/utils';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
const signer0 = provider.getSigner(0); // convention matches setupContracts function
let signer0Address;
let ERC20AssetHolder: ethers.Contract;
let Token: ethers.Contract;
let depositedEvent;
let transferEvent;
const AUTH_TYPES = ['address', 'address', 'uint256', 'address'];

beforeAll(async () => {
  ERC20AssetHolder = await setupContracts(provider, ERC20AssetHolderArtifact);
  signer0Address = await signer0.getAddress();
  Token = await setupContracts(provider, TokenArtifact);
});

const description1 = 'Withdraws Tokens (signer = participant, holdings[participant] =  amount)';
const description2 =
  'Reverts token withdrawal (signer =/= participant, holdings[participant] = amount';
const description3 =
  'Reverts token withdrawal (signer = participant, holdings[participant] < amount';

describe('deposit', () => {
  it.each`
    description     | held   | signer     | amount | authorized | reasonString
    ${description1} | ${'1'} | ${signer0} | ${'1'} | ${true}    | ${undefined}
    ${description2} | ${'1'} | ${signer0} | ${'1'} | ${false}   | ${'Withdraw | not authorized by participant'}
    ${description3} | ${'1'} | ${signer0} | ${'2'} | ${true}    | ${'Withdraw | overdrawn'}
  `('$description', async ({held, signer, amount, authorized, reasonString}) => {
    held = ethers.utils.bigNumberify(held);
    amount = ethers.utils.bigNumberify(amount);
    const zero = ethers.utils.bigNumberify('0');
    const participant = ethers.Wallet.createRandom();

    // check msg.sender has enough tokens
    const balance = await Token.balanceOf(signer0Address);
    await expect(balance.gte(held.add(amount))).toBe(true);

    // Increase allowance by calling approve
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
      depositedEvent = newDepositedEvent(ERC20AssetHolder, participant.address.padEnd(66, '0'));
      transferEvent = newTransferEvent(Token, ERC20AssetHolder.address);
      await (await ERC20AssetHolder.deposit(
        participant.address.padEnd(66, '0'),
        zero,
        held,
      )).wait();
      expect(await ERC20AssetHolder.holdings(participant.address.padEnd(66, '0'))).toEqual(held);
      await depositedEvent;
      expect(await transferEvent).toEqual(held);
    }

    // authorize withdraw
    const authorization = defaultAbiCoder.encode(AUTH_TYPES, [
      participant.address,
      signer0Address,
      amount,
      signer0Address,
    ]);

    const authorizer = authorized ? participant : signer;
    const sig = await sign(authorizer, keccak256(authorization));

    // call method in a slightly different way if expecting a revert
    if (reasonString) {
      const regex = new RegExp(
        '^' + 'VM Exception while processing transaction: revert ' + reasonString + '$',
      );
      await expectRevert(
        () =>
          ERC20AssetHolder.withdraw(
            participant.address,
            signer0Address,
            amount,
            sig.v,
            sig.r,
            sig.s,
          ),
        regex,
      );
    } else {
      const balanceBefore = await Token.balanceOf(signer0Address);
      const tx = await ERC20AssetHolder.withdraw(
        participant.address,
        signer0Address,
        amount,
        sig.v,
        sig.r,
        sig.s,
      );

      // wait for tx to be mined
      await tx.wait();

      // check for token balance change
      await expect(await Token.balanceOf(signer0Address)).toEqual(balanceBefore.add(amount));
      // check for holdings decrease
      const newHoldings = await ERC20AssetHolder.holdings(participant.address.padEnd(66, '0'));
      expect(newHoldings).toEqual(held.sub(amount));
    }
  });
});
