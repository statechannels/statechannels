import linker from 'solc/linker';
import { ethers, ContractFactory } from 'ethers';

// @ts-ignore
import OutcomeArtifact from '../build/contracts/Outcome.json';
// @ts-ignore
import TestOutcomeArtifact from '../build/contracts/TestOutcome.json';
import {
  makeAllocation,
  ETH,
  encodeAllocation,
  makeGuarantee,
  encodeGuarantee,
} from '../src/outcome';
import { bigNumberify } from 'ethers/utils';

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
    it('parses an allocation', async () => {
      const asAddress = '0x5409ED021D9299bf6814279A6A1411A7e866A631';

      const allocation = makeAllocation([[asAddress, 5, ETH]]);
      const bytes = encodeAllocation(allocation);

      const result = await testOutcomeLib.toTokenOutcome(bytes);
      expect(result[0].token).toEqual(ETH);
      const typedOutcome = await testOutcomeLib.toTypedOutcome(result[0].typedOutcome);

      expect(await testOutcomeLib.isAllocation(typedOutcome)).toBe(true);

      const parsedAllocation = await testOutcomeLib.toAllocation(typedOutcome.data);

      expect(parsedAllocation[0].destination).toEqual(asAddress);
      expect(parsedAllocation[0].amount).toEqual(bigNumberify(5));
    });

    it('parses a guarantee', async () => {
      const asAddress = '0x5409ED021D9299bf6814279A6A1411A7e866A631';
      const bsAddress = '0x6Ecbe1DB9EF729CBe972C83Fb886247691Fb6beb';

      const guarantee = makeGuarantee(asAddress, [[ETH, [bsAddress]]]);
      const bytes = encodeGuarantee(guarantee);

      const result = await testOutcomeLib.toTokenOutcome(bytes);
      expect(result[0].token).toEqual(ETH);
      const typedOutcome = await testOutcomeLib.toTypedOutcome(result[0].typedOutcome);

      expect(await testOutcomeLib.isGuarantee(typedOutcome)).toBe(true);

      const parsedGuarantee = await testOutcomeLib.toGuarantee(typedOutcome.data);

      expect(parsedGuarantee.guaranteedChannelId).toEqual(asAddress);
      expect(parsedGuarantee.destinations).toEqual([bsAddress]);
    });
  });
});
