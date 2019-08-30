import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import ETHAssetHolderArtifact from '../../build/contracts/ETHAssetHolder.json';
import {setupContracts, sign} from '../test-helpers';
import {keccak256, defaultAbiCoder} from 'ethers/utils';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
const signer0 = provider.getSigner(0); // convention matches setupContracts function
let signer0Address;
let ETHAssetHolder: ethers.Contract;
const AUTH_TYPES = ['address', 'address', 'uint256', 'address'];

beforeAll(async () => {
  ETHAssetHolder = await setupContracts(provider, ETHAssetHolderArtifact);
  signer0Address = await signer0.getAddress();
});

const description1 = 'Withdraws ETH (signer = participant, holdings[participant] = 2 * amount)';

// amounts are valueString represenationa of wei
describe('deposit', () => {
  it.each`
    description     | held   | signer     | amount | reasonString
    ${description1} | ${'2'} | ${signer0} | ${'1'} | ${undefined}
  `('$description', async ({destinationType, held, signer, amount, reasonString}) => {
    held = ethers.utils.parseUnits(held, 'wei');
    amount = ethers.utils.parseUnits(amount, 'wei');
    const participant = ethers.Wallet.createRandom();
    // set holdings by depositing in the 'safest' way
    if (held > 0) {
      await (await ETHAssetHolder.deposit(participant.address.padEnd(66, '0'), 0, held, {
        value: held,
      })).wait();
      expect(await ETHAssetHolder.holdings(participant.address.padEnd(66, '0'))).toEqual(held);
    }

    // authorize withdraw
    const authorization = defaultAbiCoder.encode(AUTH_TYPES, [
      participant.address,
      signer0Address,
      amount,
      signer0Address,
    ]);

    const sig = await sign(participant, keccak256(authorization));

    // call method in a slightly different way if expecting a revert
    if (reasonString) {
      const regex = new RegExp(
        '^' + 'VM Exception while processing transaction: revert ' + reasonString + '$',
      );
      await expectRevert(
        () =>
          ETHAssetHolder.withdraw(participant.address, signer0Address, amount, sig.v, sig.r, sig.s),
        regex,
      );
    } else {
      const balanceBefore = await signer.getBalance();
      const tx = await ETHAssetHolder.withdraw(
        participant.address,
        signer0Address,
        amount,
        sig.v,
        sig.r,
        sig.s,
      );
      // wait for tx to be mined
      const receipt = await tx.wait();
      // check for EOA balance change
      const gasCost = await tx.gasPrice.mul(receipt.cumulativeGasUsed);
      await expect(await signer.getBalance()).toEqual(balanceBefore.add(amount).sub(gasCost));
      // check for holdings decrease
      const newHoldings = await ETHAssetHolder.holdings(participant.address.padEnd(66, '0'));
      expect(newHoldings).toEqual(held.sub(amount));
    }
  });
});
