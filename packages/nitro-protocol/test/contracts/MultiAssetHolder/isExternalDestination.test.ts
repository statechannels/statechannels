import {getTestProvider, setupContract} from '../../test-helpers';
import {TESTNitroAdjudicator} from '../../../typechain/TESTNitroAdjudicator';
import TESTNitroAdjudicatorArtifact from '../../../artifacts/contracts/test/TESTNitroAdjudicator.sol/TESTNitroAdjudicator.json';

const testNitroAdjudicator = (setupContract(
  getTestProvider(),
  TESTNitroAdjudicatorArtifact,
  process.env.TEST_NITRO_ADJUDICATOR_ADDRESS
) as unknown) as TESTNitroAdjudicator;

describe('isExternalDestination', () => {
  it('verifies an external destination', async () => {
    const zerosPaddedExternalDestination =
      '0x' + 'eb89373c708B40fAeFA76e46cda92f801FAFa288'.padStart(64, '0');
    expect(await testNitroAdjudicator.isExternalDestination(zerosPaddedExternalDestination)).toBe(
      true
    );
  });
  it('rejects a non-external-address', async () => {
    const onesPaddedExternalDestination =
      '0x' + 'eb89373c708B40fAeFA76e46cda92f801FAFa288'.padStart(64, '1');
    expect(await testNitroAdjudicator.isExternalDestination(onesPaddedExternalDestination)).toBe(
      false
    );
  });
});
