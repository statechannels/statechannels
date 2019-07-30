import linker from 'solc/linker';
import { ethers, ContractFactory, Wallet } from 'ethers';

// @ts-ignore
import OutcomeArtifact from '../build/contracts/Outcome.json';
// @ts-ignore
import TestOutcomeArtifact from '../build/contracts/TestOutcome.json';
import { ADDRESS_ZERO } from '../src/index.js';

const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
const signer = provider.getSigner();

describe('Outcome', () => {
  let testOutcomeLib;

  beforeAll(async () => {
    const networkId = (await provider.getNetwork()).chainId;

    TestOutcomeArtifact.bytecode = linker.linkBytecode(TestOutcomeArtifact.bytecode, {
      Outcome: OutcomeArtifact.networks[networkId].address,
    });
    testOutcomeLib = await ContractFactory.fromSolidity(TestOutcomeArtifact, signer).deploy();
  });

  describe('isAllocation', () => {
    it('returns true for allocations', async () => {
      expect(await testOutcomeLib.isAllocation({ outcomeType: 0, data: '0x0' })).toBe(true);
    });

    it('returns false for guarantees', async () => {
      expect(await testOutcomeLib.isAllocation({ outcomeType: 1, data: '0x0' })).toBe(false);
    });
  });

  describe('isGuarantee', () => {
    it('returns true for guarantees', async () => {
      expect(await testOutcomeLib.isGuarantee({ outcomeType: 1, data: '0x0' })).toBe(true);
    });

    it('returns false for allocations', async () => {
      expect(await testOutcomeLib.isGuarantee({ outcomeType: 0, data: '0x0' })).toBe(false);
    });
  });

  describe('toTokenOutcome', () => {
    it('parses bytes', async () => {
      // TODO: tidy by extracting helpers to an outcome lib file
      const address = new Wallet('6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1')
        .address;

      const bytes = ethers.utils.defaultAbiCoder.encode(
        ['tuple(address token, bytes typedOutcome)[]'],
        [[{ token: address, typedOutcome: '0xb' }, { token: address, typedOutcome: '0xc' }]],
      );

      const result = await testOutcomeLib.toTokenOutcome(bytes);
    });
  });
});
