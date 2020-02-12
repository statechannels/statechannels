import {MemoryStore} from './memory-store';
import {Objective} from './wire-protocol';
import {SimpleEthAllocation, State} from './types';
import {bigNumberify, BigNumber} from 'ethers/utils';
import {Wallet} from 'ethers';
import {calculateChannelId} from './state-utils';

const {address: aAddress, privateKey: aPrivateKey} = Wallet.createRandom();
// const {address: bAddress, privateKey: bPrivateKey} = Wallet.createRandom();
const {address: bAddress} = Wallet.createRandom();
const [aDestination, bDestination] = [aAddress, bAddress]; // for convenience

const outcome: SimpleEthAllocation = {
  type: 'SimpleEthAllocation',
  allocationItems: [
    {destination: aDestination, amount: new BigNumber(5)},
    {destination: bDestination, amount: new BigNumber(6)}
  ]
};
const turnNum = bigNumberify(4);
const appData = '0xabc';
const isFinal = false;
const chainId = '1';
const participants = [
  {participantId: 'a', destination: aDestination, signingAddress: aAddress},
  {participantId: 'b', destination: aDestination, signingAddress: bAddress}
];
const stateVars = {outcome, turnNum, appData, isFinal};
const channelNonce = bigNumberify(0);
const appDefinition = '0x5409ED021D9299bf6814279A6A1411A7e866A631';
const challengeDuration = bigNumberify(60);
const channelConstants = {chainId, participants, channelNonce, appDefinition, challengeDuration};
const state: State = {...stateVars, ...channelConstants};
const channelId = calculateChannelId(channelConstants);
const signature = '0x123';
const signedState = {...state, signature};
const signedStates = [signedState];

describe('getAddress', () => {
  it('returns an address', () => {
    const store = new MemoryStore([aPrivateKey]);
    const address = store.getAddress();

    expect(address).toEqual(aAddress);
  });
});
const aStore = () => new MemoryStore([aPrivateKey]);

describe('stateReceivedFeed', () => {
  test('it fires when a state with the correct channel id is received', () => {
    const store = aStore();
    const outputs: State[] = [];
    store.stateReceivedFeed(channelId).subscribe(x => outputs.push(x));
    store.pushMessage({signedStates});

    expect(outputs).toEqual([state]);
  });

  test("it doesn't fire if the channelId doesn't match", () => {
    const store = aStore();

    const outputs: State[] = [];
    store.stateReceivedFeed('a-different-channel-id').subscribe(x => outputs.push(x));
    store.pushMessage({signedStates});

    expect(outputs).toEqual([]);
  });
});

test('newObjectiveFeed', () => {
  const objective: Objective = {
    name: 'OpenChannel',
    participants: [],
    data: {targetChannelId: 'foo'}
  };

  const store = aStore();

  const outputs: Objective[] = [];
  store.newObjectiveFeed.subscribe(x => outputs.push(x));

  store.pushMessage({objectives: [objective]});
  expect(outputs).toEqual([objective]);

  // doing it twice doesn't change anything
  store.pushMessage({objectives: [objective]});
  expect(outputs).toEqual([objective]);
});

describe('createChannel', () => {
  it('returns a ChannelStoreEntry', async () => {
    const store = aStore();

    const firstEntry = await store.createChannel(
      participants,
      challengeDuration,
      stateVars,
      appDefinition
    );

    expect(firstEntry.channelId).toMatch(/0x/);
    expect(firstEntry.latestSupportedByMe).toBeUndefined();

    const secondEntry = await store.createChannel(
      participants,
      challengeDuration,
      stateVars,
      appDefinition
    );

    expect(firstEntry.channelId).not.toEqual(secondEntry.channelId);
  });

  it("fails if the wallet doesn't hold the private key for any participant", async () => {
    const store = new MemoryStore();

    await expect(
      store.createChannel(participants, challengeDuration, stateVars, appDefinition)
    ).rejects.toMatchObject({
      message: "Couldn't find the signing key for any participant in wallet."
    });
  });
});

describe('pushMessage', () => {
  it('stores states', async () => {
    const store = new MemoryStore([aPrivateKey]);
    await store.createChannel(signedState.participants, signedState.challengeDuration, signedState);

    expect((await store.getEntry(channelId)).latest).toBeUndefined();
    await store.pushMessage({signedStates});
    expect((await store.getEntry(channelId)).latest).toMatchObject(signedState);
  });

  it('creates a channel if it receives states for a new channel', async () => {
    const store = new MemoryStore([aPrivateKey]);
    await store.pushMessage({signedStates});
    expect(await store.getEntry(channelId)).not.toBeUndefined();
  });
});
