import * as ethers from 'ethers';
import NitroArtifact from '../build/contracts/NitroAdjudicator.json';
import { AddressZero } from 'ethers/constants';
jest.setTimeout(20000);

const DEPOSIT_AMOUNT = ethers.utils.parseEther('1'); //

describe('Nitro', () => {
  let networkId;
  const provider = new ethers.providers.JsonRpcProvider(
    `http://localhost:${process.env.DEV_GANACHE_PORT}`,
  );
  const signer1 = provider.getSigner(1);
  let nitro;

  beforeAll(async () => {
    networkId = (await provider.getNetwork()).chainId;
    const libraryAddress = NitroArtifact.networks[networkId].address;
    nitro = new ethers.Contract(libraryAddress, NitroArtifact.abi, signer1);
  });

  // Transition function tests
  // ========================

  it('deposits', async () => {
    // Create a new instance of the Contract with a Signer, which allows
    // update methods
    const tx = await nitro.deposit(AddressZero, 0, DEPOSIT_AMOUNT, AddressZero, {
      value: DEPOSIT_AMOUNT,
    });
    console.log(tx.hash);
    await tx.wait();
    const allocatedAmount = await nitro.holdings(AddressZero, AddressZero);
    expect(allocatedAmount).toEqual(DEPOSIT_AMOUNT);
  });
});
