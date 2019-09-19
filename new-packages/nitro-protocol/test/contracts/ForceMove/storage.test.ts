import {ethers} from 'ethers';
// @ts-ignore
import ForceMoveArtifact from '../../../build/contracts/TESTForceMove.json';
// @ts-ignore
import {setupContracts} from '../../test-helpers';
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
    ${0x123456}   | ${0x789}
    ${123456}     | ${789}
  `('Hashing and data retrieval', async storage => {
    const blockchainStorage = {...storage, ...zeroData};
    const blockchainHash = await ForceMove.getHash(blockchainStorage);
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

describe('__slotEmptyOrMatchesHash', () => {
  it.each`
    turnNumRecord | finalizesAt
    ${0x42}       | ${0x9001}
    ${0x123456}   | ${0x789}
    ${123456}     | ${789}
  `('works when the slot is empty', async storage => {
    const blockchainStorage = {...storage, ...zeroData};
    expect(await ForceMove.slotEmptyOrMatchesHash(blockchainStorage, HashZero)).toBe(true);
  });
});
