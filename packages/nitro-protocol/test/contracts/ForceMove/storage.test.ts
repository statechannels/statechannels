import {expectRevert} from '@statechannels/devtools';
import {Contract, ethers} from 'ethers';

import ForceMoveArtifact from '../../../artifacts/contracts//test/TESTForceMove.sol/TESTForceMove.json';
import {channelDataToStatus, parseStatus} from '../../../src/contract/channel-storage';
import {getTestProvider, randomChannelId, setupContract} from '../../test-helpers';

const provider = getTestProvider();
let ForceMove: Contract;
beforeAll(async () => {
  ForceMove = setupContract(provider, ForceMoveArtifact, process.env.TEST_FORCE_MOVE_ADDRESS);
});

const zeroData = {
  stateHash: ethers.constants.HashZero,
  outcomeHash: ethers.constants.HashZero,
};
describe('storage', () => {
  it.each`
    turnNumRecord | finalizesAt
    ${0x42}       | ${0x9001}
    ${123456}     | ${789}
  `('Statusing and data retrieval', async storage => {
    const blockchainStorage = {...storage, ...zeroData};
    const blockchainStatus = await ForceMove.generateStatus(blockchainStorage);
    const clientStatus = channelDataToStatus(storage);

    const expected = {...storage, fingerprint: '0x' + clientStatus.slice(2 + 24)};

    expect(clientStatus).toEqual(blockchainStatus);
    expect(await ForceMove.matchesStatus(blockchainStorage, blockchainStatus)).toBe(true);
    expect(await ForceMove.matchesStatus(blockchainStorage, clientStatus)).toBe(true);

    expect(parseStatus(clientStatus)).toMatchObject(expected);

    // Testing getData is a little more laborious
    await (
      await ForceMove.setStatusFromChannelData(ethers.constants.HashZero, blockchainStorage)
    ).wait();
    const {turnNumRecord, finalizesAt, fingerprint: f} = await ForceMove.unpackStatus(
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
    expect(await ForceMove.statusOf(channelId)).toEqual(ethers.constants.HashZero);
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

      await (await ForceMove.setStatusFromChannelData(channelId, blockchainStorage)).wait();
      expect(await ForceMove.statusOf(channelId)).toEqual(channelDataToStatus(blockchainStorage));

      const tx = ForceMove.requireChannelOpen(channelId);
      // eslint-disable-next-line no-unused-expressions
      result === 'reverts' ? await expectRevert(() => tx, 'Channel not open.') : await tx;
    }
  );
});
