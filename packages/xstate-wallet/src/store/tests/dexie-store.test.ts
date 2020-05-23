/* eslint-disable jest/no-disabled-tests */
import {Store} from '../store';
import {State, Objective, DomainBudget, AssetBudget, ObjectStores} from '../types';

import {Wallet, BigNumber} from 'ethers';
import {calculateChannelId, createSignatureEntry} from '../state-utils';
import {CHAIN_NETWORK_ID, CHALLENGE_DURATION} from '../../config';
import {simpleEthAllocation, makeDestination} from '../../utils';
import {Backend} from '../dexie-backend';
import {ChannelStoreEntry} from '../channel-store-entry';
import {Errors} from '..';
import {Zero} from '@ethersproject/constants';
require('fake-indexeddb/auto');

const {address: aAddress, privateKey: aPrivateKey} = new Wallet(
  '0x95942b296854c97024ca3145abef8930bf329501b718c0f66d57dba596ff1318'
); // 0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf

const {address: bAddress, privateKey: bPrivateKey} = new Wallet(
  '0xb3ab7b031311fe1764b657a6ae7133f19bac97acd1d7edca9409daa35892e727'
); // 0x2222E21c8019b14dA16235319D34b5Dd83E644A9
const [aDestination, bDestination] = [aAddress, bAddress].map(makeDestination);

const outcome = simpleEthAllocation([
  {destination: aDestination, amount: BigNumber.from(5)},
  {destination: bDestination, amount: BigNumber.from(6)}
]);
const turnNum = BigNumber.from(4);
const appData = '0xabc';
const isFinal = false;
const chainId = CHAIN_NETWORK_ID;
const participants = [
  {participantId: 'a', destination: aDestination, signingAddress: aAddress},
  {participantId: 'b', destination: bDestination, signingAddress: bAddress}
];
const stateVars = {outcome, turnNum, appData, isFinal};
const channelNonce = Zero;
const appDefinition = '0x5409ED021D9299bf6814279A6A1411A7e866A631';

const challengeDuration = BigNumber.from(CHALLENGE_DURATION);
const channelConstants = {chainId, participants, channelNonce, appDefinition, challengeDuration};
const state: State = {...stateVars, ...channelConstants};
const channelId = calculateChannelId(channelConstants);
const signature = createSignatureEntry(state, aPrivateKey);
const signedState = {...state, signatures: [signature]};
const signedStates = [signedState];

const aStore = async (noPrivateKeys = false) => {
  const store = new Store(undefined, new Backend());
  const privateKeys = noPrivateKeys ? undefined : [aPrivateKey];
  await store.initialize(privateKeys, true);
  return store;
};

describe('getAddress', () => {
  it('returns an address', async () => {
    const store = await aStore();
    const address = await store.getAddress();

    expect(address).toEqual(aAddress);
  });
});

describe('channelUpdatedFeed', () => {
  test('it fires when a state with the correct channel id is received', async () => {
    const store = await aStore();
    return new Promise(resolve => {
      store.channelUpdatedFeed(channelId).subscribe(x => {
        expect(x.latest).toMatchObject(state);
        resolve();
      });

      store.pushMessage({signedStates});
    });
  });

  test("it doesn't fire if the channelId doesn't match", async () => {
    const store = await aStore();

    const outputs: ChannelStoreEntry[] = [];
    store.channelUpdatedFeed('a-different-channel-id').subscribe(x => outputs.push(x));
    await store.pushMessage({signedStates});

    expect(outputs).toEqual([]);
  });
});

test('newObjectiveFeed', async () => {
  const objective: Objective = {
    type: 'OpenChannel',
    participants: [],
    data: {targetChannelId: 'foo', fundingStrategy: 'Direct'}
  };

  const store = await aStore();

  const outputs: Objective[] = [];
  store.objectiveFeed.subscribe(x => outputs.push(x));

  await store.pushMessage({objectives: [objective]});
  expect(outputs).toEqual([objective]);

  // doing it twice doesn't change anything
  await store.pushMessage({objectives: [objective]});
  expect(outputs).toEqual([objective]);
});

describe('createChannel', () => {
  it('returns a ChannelStoreEntry', async () => {
    const store = await aStore();

    const firstEntry = await store.createChannel(
      participants,
      challengeDuration,
      stateVars,
      appDefinition
    );

    expect(firstEntry.channelId).toMatch(/0x/);

    const secondEntry = await store.createChannel(
      participants,
      challengeDuration,
      stateVars,
      appDefinition
    );

    expect(firstEntry.channelId).not.toEqual(secondEntry.channelId);
  });

  it("fails if the wallet doesn't hold the private key for any participant", async () => {
    const store = await aStore(true);

    await expect(
      store.createChannel(participants, challengeDuration, stateVars, appDefinition)
    ).rejects.toMatchObject({
      message: "Couldn't find the signing key for any participant in wallet."
    });
  });
});

describe('signAndAdd', () => {
  let entry: ChannelStoreEntry;
  let store: Store;
  beforeEach(async () => {
    store = await aStore();

    entry = await store.createChannel(participants, challengeDuration, stateVars, appDefinition);
  });
  it('returns the new entry when successful', async () => {
    const {channelId, latest} = entry;

    const turnNum = latest.turnNum.add(5);
    const newEntry = await store.signAndAddState(channelId, {...latest, turnNum});

    expect(newEntry.latestSignedByMe.turnNum.toString()).toMatch(turnNum.toString());
  });

  it('reverts if the state is stale', async () => {
    const {channelId, latest} = entry;
    const expectStateTurnNums = async turnNums =>
      expect((await store.getEntry(channelId)).sortedStates.map(s => s.turnNum.toNumber())).toEqual(
        turnNums
      );

    await expectStateTurnNums([latest.turnNum.toNumber()]);

    const turnNum = latest.turnNum.add(5);
    const {latestSignedByMe} = await store.signAndAddState(channelId, {...latest, turnNum});
    await expectStateTurnNums([turnNum.toNumber(), latest.turnNum.toNumber()]);

    const staleTurnNum = latestSignedByMe.turnNum.sub(2);

    await expect(store.signAndAddState(channelId, latest)).rejects.toThrow(Errors.staleState);
    await expect(
      store.signAndAddState(channelId, {...latest, turnNum: staleTurnNum})
    ).rejects.toThrow(Errors.staleState);

    await expectStateTurnNums([turnNum.toNumber(), latest.turnNum.toNumber()]);
  });
});

describe('pushMessage', () => {
  it('stores states', async () => {
    const store = await aStore();
    await store.createChannel(
      signedState.participants,
      signedState.challengeDuration,
      {...signedState, turnNum: Zero},
      signedState.appDefinition
    );

    const nextState = {...state, turnNum: state.turnNum.add(2)};
    await store.pushMessage({
      signedStates: [{...nextState, signatures: [createSignatureEntry(nextState, bPrivateKey)]}]
    });
    expect((await store.getEntry(channelId)).latest).toMatchObject(nextState);
  });

  it('creates a channel if it receives states for a new channel', async () => {
    const store = await aStore();
    await store.pushMessage({signedStates});
    expect(await store.getEntry(channelId)).not.toBeUndefined();
  });
});

describe('getBudget', () => {
  it('returns an address', async () => {
    const store = await aStore();
    const budget: DomainBudget = {
      domain: 'localhost',
      hubAddress: 'foo',
      forAsset: {
        ETH: {
          assetHolderAddress: 'home',
          availableSendCapacity: BigNumber.from(10),
          availableReceiveCapacity: BigNumber.from(5),
          channels: {}
        }
      }
    };
    await store.createBudget(budget);

    const storedBudget = await store.getBudget(budget.domain);

    const {availableReceiveCapacity, availableSendCapacity} = storedBudget?.forAsset
      .ETH as AssetBudget;
    expect(availableReceiveCapacity.add(availableSendCapacity).eq(15)).toBeTruthy();
  });
});

describe('setLedger', () => {
  it('works', async () => {
    const store = await aStore();

    await store.addState(signedState);
    await store.setLedger(channelId);
    expect((await store.getLedger(participants[1].participantId)).channelId).toEqual(channelId);
  });
});

const getBackend = (store: Store) => (store as any).backend as Backend;

describe('transactions', () => {
  // TODO:
  // These tests generally pass, but something is going wrong with the
  // expectations on promise rejections
  // expect(...).rejects.toThrow('someMessage')
  // will fail if 'someMessage' is incorrect, but if it is correct, then
  // 1. the test passes
  // 2. either jest or dexie warns about an unhandled rejection
  let warner;
  beforeAll(() => {
    warner = console.warn;
    console.warn = () => console.error('Suppressing fire');
  });
  afterAll(() => (console.warn = warner.bind(console)));

  let backend: Backend;
  beforeEach(async () => {
    backend = getBackend(await aStore());
  });

  it('works', async () => {
    const result = await backend.transaction('readwrite', [ObjectStores.ledgers], async () => {
      await backend.setLedger('foo', 'bar');

      return await backend.getLedger('foo');
    });

    expect(result).toEqual('bar');
  });

  it('throws when writing during a readwrite transaction', async () =>
    expect(
      backend.transaction(
        'readonly',
        [ObjectStores.ledgers],
        async () => await backend.setLedger('foo', 'bar')
      )
    ).rejects.toThrow('Transaction is readonly'));

  it('throws when accessing stores not whitelisted', async () =>
    expect(
      backend.transaction(
        'readonly',
        [ObjectStores.ledgers],
        async () => await backend.getPrivateKey('foo')
      )
    ).rejects.toThrow('NotFoundError:'));

  it('throws when aborted', () =>
    expect(
      backend.transaction('readonly', [ObjectStores.ledgers], async tx => {
        tx.abort();

        return;
      })
    ).rejects.toThrow('Transaction committed too early.'));

  it('throws when awaiting an external async call', () =>
    expect(
      backend.transaction(
        'readonly',
        [ObjectStores.ledgers],
        () =>
          new Promise(resolve => {
            setTimeout(resolve, 100);
          })
      )
    ).rejects.toThrow('Transaction committed too early.'));
});
