import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import ERC20AssetHolderArtifact from '../../build/contracts/TESTERC20AssetHolder.json';
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
const chainId = 1234;
const participants = ['', '', ''];
// populate wallets and participants array
for (let i = 0; i < 3; i++) {
  participants[i] = ethers.Wallet.createRandom().address;
}

beforeAll(async () => {
  ERC20AssetHolder = await setupContracts(provider, ERC20AssetHolderArtifact);
  signer0Address = await signer0.getAddress();
  Token = await setupContracts(provider, TokenArtifact);
  signer0Address = await signer0.getAddress();
});

const description0 = 'Reverts transferAll tx when no outcomeHash does not match)';
const description1 =
  'Pays ETH out when directly-funded channel afford sufficient ETH for external address)';

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

    // check msg.sender has enough tokens
    const balance = await Token.balanceOf(signer0Address);
    await expect(balance.gte(held)).toBe(true);

    // Increase allowance by calling approve
    await (await Token.increaseAllowance(ERC20AssetHolder.address, held)).wait();

    // check allowance updated
    const allowance = await Token.allowance(signer0Address, ERC20AssetHolder.address);
    expect(allowance.sub(held).gte(0)).toBe(true);

    // set holdings by depositing in the 'safest' way
    if (held > 0) {
      depositedEvent = newDepositedEvent(ERC20AssetHolder, channelId);
      transferEvent = newTransferEvent(Token, ERC20AssetHolder.address);
      await (await ERC20AssetHolder.deposit(channelId, 0, held)).wait();
      expect(await ERC20AssetHolder.holdings(channelId)).toEqual(held);
      await depositedEvent;
      expect(await transferEvent).toEqual(held);
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
    ERC20AssetHolder.setOutcomePermissionless(channelId, keccak256(outcomeContent));

    // call method in a slightly different way if expecting a revert
    if (reasonString) {
      const regex = new RegExp(
        '^' + 'VM Exception while processing transaction: revert ' + reasonString + '$',
      );
      await expectRevert(() => ERC20AssetHolder.transferAll(channelId, allocation), regex);
    } else {
      const balanceBefore = await signer0.getBalance();
      const tx = await ERC20AssetHolder.transferAll(channelId, allocation);
      // wait for tx to be mined
      const receipt = await tx.wait();
      // check for token balance change
      await expect(await Token.balanceOf(signer0Address)).toEqual(balanceBefore.add(amount));
      // check for holdings decrease
      const newHoldings = await ERC20AssetHolder.holdings(channelId);
      expect(newHoldings).toEqual(held.sub(amount));
    }
  });
});
