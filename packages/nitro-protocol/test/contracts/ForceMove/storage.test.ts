import {expectRevert} from '@statechannels/devtools';
import {Contract, ethers} from 'ethers';

import ForceMoveArtifact from '../../../artifacts/contracts//test/TESTForceMove.sol/TESTForceMove.json';
import {channelDataToFingerprint, parseFingerprint} from '../../../src/contract/channel-storage';
import {getTestProvider, randomChannelId, setupContracts} from '../../test-helpers';

const provider = getTestProvider();
let ForceMove: Contract;
beforeAll(async () => {
  ForceMove = await setupContracts(
    provider,
    ForceMoveArtifact,
    process.env.TEST_FORCE_MOVE_ADDRESS
  );
});

const zeroData = {
  stateHash: ethers.constants.HashZero,
  outcomeHash: ethers.constants.HashZero,
  challengerAddress: ethers.constants.AddressZero,
};
describe('storage', () => {
  it.each`
    turnNumRecord | finalizesAt
    ${0x42}       | ${0x9001}
    ${123456}     | ${789}
  `('Fingerprinting and data retrieval', async storage => {
    const blockchainStorage = {...storage, ...zeroData};
    const blockchainFingerprint = await ForceMove.generateFingerprint(blockchainStorage);
    const clientFingerprint = channelDataToFingerprint(storage);

    const expected = {...storage, thumbprint: '0x' + clientFingerprint.slice(2 + 24)};

    expect(clientFingerprint).toEqual(blockchainFingerprint);
    expect(await ForceMove.matchesFingerprint(blockchainStorage, blockchainFingerprint)).toBe(true);
    expect(await ForceMove.matchesFingerprint(blockchainStorage, clientFingerprint)).toBe(true);

    expect(parseFingerprint(clientFingerprint)).toMatchObject(expected);

    // Testing getData is a little more laborious
    await (
      await ForceMove.setFingerprintFromChannelData(ethers.constants.HashZero, blockchainStorage)
    ).wait();
    const {turnNumRecord, finalizesAt, thumbprint: f} = await ForceMove.unpackFingerprint(
      ethers.constants.HashZero
    );
    expect({turnNumRecord, finalizesAt, thumbprint: f._hex}).toMatchObject(expected);
  });
});

describe('_requireChannelOpen', () => {
  let channelId;
  beforeEach(() => {
    channelId = randomChannelId();
  });

  it('works when the slot is empty', async () => {
    expect(await ForceMove.fingerprints(channelId)).toEqual(ethers.constants.HashZero);
    await ForceMove.requireChannelOpen(channelId);
  });

  it.each`
    result       | turnNumRecord | finalizesAt
    ${'reverts'} | ${42}         | ${1e12}
    ${'reverts'} | ${42}         | ${0x9001}
    ${'works'}   | ${123}        | ${'0x00'}
    ${'works'}   | ${0xabc}      | ${'0x00'}
    ${'works'}   | ${1}          | ${'0x00'}
    ${'works'}   | ${0}          | ${'0x00'}
  `(
    '$result with turnNumRecord: $turnNumRecord, finalizesAt: $finalizesAt',
    async ({turnNumRecord, finalizesAt, result}) => {
      const blockchainStorage = {turnNumRecord, finalizesAt, ...zeroData};

      await (await ForceMove.setFingerprintFromChannelData(channelId, blockchainStorage)).wait();
      expect(await ForceMove.fingerprints(channelId)).toEqual(
        channelDataToFingerprint(blockchainStorage)
      );

      const tx = ForceMove.requireChannelOpen(channelId);
      // eslint-disable-next-line no-unused-expressions
      result === 'reverts' ? await expectRevert(() => tx, 'Channel not open.') : await tx;
    }
  );
});
