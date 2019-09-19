import {ethers} from 'ethers';
// @ts-ignore
import POCArtifact from '../../../build/contracts/POC.json';
// @ts-ignore
import {setupContracts} from '../../test-helpers';
import {HashZero, AddressZero} from 'ethers/constants';
import {hashChannelStorage, parseChannelStorageHash} from '../../../src/contract/channel-storage';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
let POC: ethers.Contract;
beforeAll(async () => {
  POC = await setupContracts(provider, POCArtifact);
});

const zeroData = {stateHash: HashZero, outcomeHash: HashZero, challengerAddress: AddressZero};
describe('forceMove', () => {
  it.each`
    turnNumRecord | finalizesAt
    ${0x42}       | ${0x9001}
    ${0x123456}   | ${0x789}
    ${123456}     | ${789}
  `('$Hashing and data retrieval', async storage => {
    const blockchainStorage = {...storage, ...zeroData};
    const blockchainHash = await POC.getHashedStorage(blockchainStorage);
    const clientHash = hashChannelStorage(storage);

    const expected = {...storage, fingerprint: '0x' + clientHash.slice(2 + 24)};

    expect(clientHash).toEqual(blockchainHash);
    expect(await POC.matchesHash(blockchainStorage, blockchainHash)).toBe(true);
    expect(await POC.matchesHash(blockchainStorage, clientHash)).toBe(true);

    const {turnNumRecord, finalizesAt, fingerprint} = await POC.getData(blockchainHash);
    expect({turnNumRecord, finalizesAt, fingerprint: fingerprint._hex}).toMatchObject(expected);
    expect(parseChannelStorageHash(clientHash)).toMatchObject(expected);
  });
});
