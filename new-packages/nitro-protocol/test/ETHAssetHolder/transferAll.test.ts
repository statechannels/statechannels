import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import ETHAssetHolderArtifact from '../../build/contracts/TESTETHAssetHolder.json';
import {setupContracts} from '../test-helpers';
import {defaultAbiCoder, keccak256} from 'ethers/utils';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
const signer0 = provider.getSigner(0); // convention matches setupContracts function
let signer0Address;
let ETHAssetHolder: ethers.Contract;
const chainId = 1234;
const participants = ['', '', ''];
// populate wallets and participants array
for (let i = 0; i < 3; i++) {
  participants[i] = ethers.Wallet.createRandom().address;
}

beforeAll(async () => {
  ETHAssetHolder = await setupContracts(provider, ETHAssetHolderArtifact);
  signer0Address = await signer0.getAddress();
});

const description0 = 'Reverts transferAll tx when no outcomeHash does not match)';
const description1 =
  'Pays ETH out when directly-funded channel afford sufficient ETH for external address)';
// amounts are valueString represenationa of wei
describe('transferAll', () => {
  it.each`
    description     | channelNonce | held   | affords | amount | reasonString
    ${description0} | ${0}         | ${'1'} | ${'0'}  | ${'1'} | ${'transferAll | submitted data does not match stored outcomeHash'}
    ${description1} | ${1}         | ${'1'} | ${'1'}  | ${'1'} | ${undefined}
  `('$description', async ({channelNonce, held, affords, amount, reasonString}) => {
    held = ethers.utils.parseUnits(held, 'wei');
    amount = ethers.utils.parseUnits(amount, 'wei');

    // compute channelId
    const channelId = keccak256(
      defaultAbiCoder.encode(
        ['uint256', 'address[]', 'uint256'],
        [chainId, participants, channelNonce],
      ),
    );

    // set holdings by depositing in the 'safest' way

    if (held > 0) {
      await (await ETHAssetHolder.deposit(channelId, 0, held, {
        value: held,
      })).wait();
      expect(await ETHAssetHolder.holdings(channelId)).toEqual(held);
    }

    // compute an appropriate allocation
    const allocation = [{destination: signer0Address.padEnd(66, '0'), amount: affords}]; // sufficient
    const labelledAllocationOrGuarantee = [
      0,
      defaultAbiCoder.encode(['tuple(bytes32 destination, uint256 amount)[]'], [allocation]),
    ];
    const outcomeContent = defaultAbiCoder.encode(
      ['tuple(uint8, bytes)'],
      [labelledAllocationOrGuarantee],
    );

    // set outcomeHash
    ETHAssetHolder.setOutcomePermissionless(channelId, keccak256(outcomeContent));

    // call method in a slightly different way if expecting a revert
    if (reasonString) {
      const regex = new RegExp(
        '^' + 'VM Exception while processing transaction: revert ' + reasonString + '$',
      );
      await expectRevert(() => ETHAssetHolder.transferAll(channelId, allocation), regex);
    } else {
      const balanceBefore = await signer0.getBalance();
      const tx = await ETHAssetHolder.transferAll(channelId, allocation);
      // wait for tx to be mined
      const receipt = await tx.wait();
      // check for EOA balance change
      const gasCost = await tx.gasPrice.mul(receipt.cumulativeGasUsed);
      await expect(await signer0.getBalance()).toEqual(balanceBefore.add(amount).sub(gasCost));
      // check for holdings decrease
      const newHoldings = await ETHAssetHolder.holdings(channelId);
      expect(newHoldings).toEqual(held.sub(amount));
    }
  });
});
