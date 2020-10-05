import {expectRevert} from '@statechannels/devtools';
import {Contract, ethers} from 'ethers';

import ForceMoveArtifact from '../../../build/contracts/TESTForceMove.json';
import {
  channelDataToChannelStorageHash,
  parseChannelStorageHash,
} from '../../../src/contract/channel-storage';
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
  `('Hashing and data retrieval', async storage => {
    const blockchainStorage = {...storage, ...zeroData};
    const blockchainHash = await ForceMove.hashChannelData(blockchainStorage);
    const clientHash = channelDataToChannelStorageHash(storage);

    const expected = {...storage, fingerprint: '0x' + clientHash.slice(2 + 24)};

    expect(clientHash).toEqual(blockchainHash);
    expect(await ForceMove.matchesHash(blockchainStorage, blockchainHash)).toBe(true);
    expect(await ForceMove.matchesHash(blockchainStorage, clientHash)).toBe(true);

    expect(parseChannelStorageHash(clientHash)).toMatchObject(expected);

    // Testing getData is a little more laborious
    await (await ForceMove.setChannelStorage(ethers.constants.HashZero, blockchainStorage)).wait();
    const {turnNumRecord, finalizesAt, fingerprint: f} = await ForceMove.getChannelStorage(
      ethers.constants.HashZero
    );
    expect({turnNumRecord, finalizesAt, fingerprint: f._hex}).toMatchObject(expected);
  });
});

describe('_requireChannelOpen', () => {
  let channelId;
  beforeEach(() => {
    channelId = randomChannelId();
  });

  it('works when the slot is empty', async () => {
    expect(await ForceMove.channelStorageHashes(channelId)).toEqual(ethers.constants.HashZero);
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

      await (await ForceMove.setChannelStorage(channelId, blockchainStorage)).wait();
      expect(await ForceMove.channelStorageHashes(channelId)).toEqual(
        channelDataToChannelStorageHash(blockchainStorage)
      );

      const tx = ForceMove.requireChannelOpen(channelId);
      // eslint-disable-next-line no-unused-expressions
      result === 'reverts' ? await expectRevert(() => tx, 'Channel not open.') : await tx;
    }
  );
});
