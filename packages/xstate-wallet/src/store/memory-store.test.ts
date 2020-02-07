import {MemoryStore, Protocol, State} from './memory-store';
import {bigNumberify} from 'ethers/utils';
import {Wallet} from 'ethers';
import {Outcome, AllocationItem} from '@statechannels/nitro-protocol/src';
import {ETH_ASSET_HOLDER_ADDRESS} from '../constants';

class SimpleOutcomeHelper {
  assetHolderAddress: string;
  constructor(assetHolderAddress: string) {
    this.assetHolderAddress = assetHolderAddress;
  }

  // e.g. allocationOutcome('0xabc...', 5, '0x123 ...', '6')
  public allocationOutcome(...args: any[]): Outcome {
    const nArgs = args.length;
    if (nArgs % 2 == 1) {
      throw new Error('must pass an even number of args');
    }
    const allocationItems: AllocationItem[] = [];
    for (let i = 0; i < nArgs / 2; i++) {
      let destination = args[2 * i];
      if (destination.length === 2 + 40) {
        // destination is an address
        destination = `0x${destination
          .slice(2, 42)
          .padStart(64, '0')
          .toLowerCase()}`;
      }
      const item = {destination, amount: bigNumberify(args[2 * i + 1]).toString()};
      allocationItems.push(item);
    }
    return [{assetHolderAddress: this.assetHolderAddress, allocation: allocationItems}];
  }
}

const {address: aAddress, privateKey: aPrivateKey} = Wallet.createRandom();
// const {address: bAddress, privateKey: bPrivateKey} = Wallet.createRandom();
const {address: bAddress} = Wallet.createRandom();
const [aDestination, bDestination] = [aAddress, bAddress]; // for convenience
const ethOutcomeHelper = new SimpleOutcomeHelper(ETH_ASSET_HOLDER_ADDRESS);
const outcome = ethOutcomeHelper.allocationOutcome(aDestination, 5, bDestination, 6);
const turnNum = bigNumberify(4);
const appData = '0xabc';
const isFinal = false;
const channelId = 'abc123';
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
const state: State = {channelId, ...stateVars, ...channelConstants};
const signature = '0x123';
const signedState = {state, signatures: [signature]};

describe('getAddress', () => {
  it('returns an address', () => {
    const store = new MemoryStore([aPrivateKey]);
    const address = store.getAddress();

    expect(address).toEqual(aAddress);
  });
});

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
    const store = new MemoryStore([aPrivateKey]);

    const channelId = await store.createChannel(
      participants,
      appDefinition,
      challengeDuration,
      stateVars
    );

    expect(channelId).toMatch(/0x/);

    const channelId2 = await store.createChannel(
      participants,
      appDefinition,
      challengeDuration,
      stateVars
    );

    expect(channelId2).toMatch(/0x/);
    expect(channelId2).not.toEqual(channelId);
  });

  it("fails if the wallet doesn't hold the private key for any participant", async () => {
    const store = new MemoryStore();

    await expect(
      store.createChannel(participants, appDefinition, challengeDuration, stateVars)
    ).rejects.toMatchObject({
      message: "Couldn't find the signing key for any participant in wallet."
    });
  });
});
