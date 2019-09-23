import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import ForceMoveArtifact from '../../../build/contracts/TESTForceMove.json';
// @ts-ignore
import {setupContracts, randomChannelId} from '../../test-helpers';
import {HashZero, AddressZero} from 'ethers/constants';
import {hashChannelStorage, parseChannelStorageHash} from '../../../src/contract/channel-storage';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
let ForceMove: ethers.Contract;
beforeAll(async () => {
  ForceMove = await setupContracts(provider, ForceMoveArtifact);
});

const zeroData = {stateHash: HashZero, outcomeHash: HashZero, challengerAddress: AddressZero};
describe('storage', () => {
  it.each`
    turnNumRecord | finalizesAt
    ${0x42}       | ${0x9001}
    ${123456}     | ${789}
  `('Hashing and data retrieval', async storage => {
    const blockchainStorage = {...storage, ...zeroData};
    const blockchainHash = await ForceMove.hashChannelStorage(blockchainStorage);
    const clientHash = hashChannelStorage(storage);

    const expected = {...storage, fingerprint: '0x' + clientHash.slice(2 + 24)};

    expect(clientHash).toEqual(blockchainHash);
    expect(await ForceMove.matchesHash(blockchainStorage, blockchainHash)).toBe(true);
    expect(await ForceMove.matchesHash(blockchainStorage, clientHash)).toBe(true);

    expect(parseChannelStorageHash(clientHash)).toMatchObject(expected);

    // Testing getData is a little more laborious
    await (await ForceMove.setChannelStorage(HashZero, blockchainStorage)).wait();
    const {turnNumRecord, finalizesAt, fingerprint: f} = await ForceMove.getData(HashZero);
    expect({turnNumRecord, finalizesAt, fingerprint: f._hex}).toMatchObject(expected);
  });
});

describe('_requireChannelOpen', () => {
  let channelId;
  beforeEach(() => {
    channelId = randomChannelId();
  });

  it('works when the slot is empty', async () => {
    expect(await ForceMove.channelStorageHashes(channelId)).toEqual(HashZero);
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
        hashChannelStorage(blockchainStorage),
      );

      const tx = ForceMove.requireChannelOpen(channelId);
      result === 'reverts' ? await expectRevert(() => tx, 'Channel not open.') : await tx;
    },
  );
});
