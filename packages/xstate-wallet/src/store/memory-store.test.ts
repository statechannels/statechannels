import {MemoryStore, Protocol, State} from './memory-store';
import {bigNumberify} from 'ethers/utils';
import {Wallet} from 'ethers';

const channelId = 'abc123';
const state = {channelId, turnNum: bigNumberify(3)};
const signature = {r: 'r', s: 's'};
const signedState = {state, signatures: [signature]};
const aWallet = Wallet.createRandom();
const bWallet = Wallet.createRandom();
const participants = [
  {participantId: 'a', destination: '0x123', signingAddress: aWallet.address},
  {participantId: 'b', destination: '0x123', signingAddress: bWallet.address}
];

describe('stateReceivedFeed', () => {
  test('it fires when a state with the correct channel id is received', () => {
    const store = new MemoryStore();
    const outputs: State[] = [];
    store.stateReceivedFeed(channelId).subscribe(x => outputs.push(x));
    store.pushMessage({signedStates: [signedState]});

    expect(outputs).toEqual([state]);
  });

  test("it doesn't fire if the channelId doesn't match", () => {
    const store = new MemoryStore();

    const outputs: State[] = [];
    store.stateReceivedFeed('a-different-channel-id').subscribe(x => outputs.push(x));
    store.pushMessage({signedStates: [signedState]});

    expect(outputs).toEqual([]);
  });
});

test('newProtocolFeed', () => {
  const protocol: Protocol = {name: 'CreateAndDirectFund', participants: []};

  const store = new MemoryStore();

  const outputs: Protocol[] = [];
  store.newProtocolFeed().subscribe(x => outputs.push(x));

  store.pushMessage({protocols: [protocol]});
  expect(outputs).toEqual([protocol]);

  // doing it twice doesn't change anything
  store.pushMessage({protocols: [protocol]});
  expect(outputs).toEqual([protocol]);
});

describe('createChannel', () => {
  it('returns a channelId', async () => {
    const store = new MemoryStore();
    const myAddress = store.getAddress();
    participants[0].signingAddress = myAddress;

    const channelId = await store.createChannel(participants);

    expect(channelId).toMatch(/0x/);

    const channelId2 = await store.createChannel(participants);

    expect(channelId2).toMatch(/0x/);
    expect(channelId2).not.toEqual(channelId);
  });

  it("fails if the wallet doesn't hold the private key for any participant", async () => {
    const store = new MemoryStore();

    await expect(store.createChannel(participants)).rejects.toMatchObject({
      message: "Couldn't find the signing key for any participant in wallet."
    });
  });
});

describe('getAddress', () => {
  it('returns an address', () => {
    const store = new MemoryStore();
    const address = store.getAddress();

    expect(address).toMatch(/0x/);
  });
});
