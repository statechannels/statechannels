import {ethers} from 'ethers';
// @ts-ignore
import POCArtifact from '../../../build/contracts/POC.json';
// @ts-ignore
import {setupContracts} from '../../test-helpers';
import {AddressZero, HashZero} from 'ethers/constants';
import {hashChannelStorage} from '../../../src/contract/channel-storage';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
let POC: ethers.Contract;

beforeAll(async () => {
  POC = await setupContracts(provider, POCArtifact);
});

const description1 = 'It works';

describe('forceMove', () => {
  it.each`
    description     | turnNumRecord | finalizesAt | stateHash   | challengerAddress | outcomeHash
    ${description1} | ${0}          | ${0}        | ${HashZero} | ${AddressZero}    | ${HashZero}
    ${description1} | ${42}         | ${9001}     | ${HashZero} | ${AddressZero}    | ${HashZero}
    ${description1} | ${123456}     | ${789}      | ${HashZero} | ${AddressZero}    | ${HashZero}
  `('$description', async storage => {
    const {challengerAddress, turnNumRecord} = storage;
    const hash = await POC.getHash(storage);
    const {turnNumRecord: currentTurnNumRecord, finalizesAt, fingerprint} = await POC.getData(hash);

    const hashedStorage = hashChannelStorage({
      challengerAddress,
      finalizesAt,
      largestTurnNum: currentTurnNumRecord,
    });
    expect(storage).toMatchObject({turnNumRecord, finalizesAt});
    expect(fingerprint._hex).toEqual(hashedStorage.slice(0, 26));
    expect(await POC.matchesHash(storage, hash)).toBe(true);
  });
});
